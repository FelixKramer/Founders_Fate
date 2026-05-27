/**
 * GET /api/sim/:id/progress
 *
 * SSE proxy — streams MiroFish progress events to the browser. Updates
 * SimulationRecord status when a terminal event arrives (completed / failed).
 *
 * Auth: requireSession() + ownership check
 */

import { requireSession } from "@/lib/guards";
import { db } from "@/lib/db";
import { withErrorHandling, NotFoundError } from "@/lib/errors";
import { track } from "@/lib/analytics";
import { mirofish } from "@/lib/mirofish";
import { enforceLimit, limiters, rateLimitKey } from "@/lib/rate-limit";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

function sseEvent(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`;
}

export const GET = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireSession();
    await enforceLimit(limiters.read, rateLimitKey(req, user.id));

    const { id } = await params;

    // Verify ownership — return 404 (not 403) to prevent IDOR.
    const sim = await db.simulationRecord.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true, scenarioId: true, startedAt: true },
    });
    if (!sim) throw new NotFoundError("simulation not found");

    const encoder = new TextEncoder();

    // If already terminal, emit a single event and close.
    if (sim.status === "completed") {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              sseEvent("done", JSON.stringify({ simulation_id: id, status: "completed" })),
            ),
          );
          controller.close();
        },
      });
      return new Response(stream, { headers: SSE_HEADERS });
    }

    if (sim.status === "failed" || sim.status === "cancelled") {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              sseEvent("error", JSON.stringify({ simulation_id: id, status: sim.status })),
            ),
          );
          controller.close();
        },
      });
      return new Response(stream, { headers: SSE_HEADERS });
    }

    // Proxy SSE from MiroFish.
    const abortController = new AbortController();

    // Abort upstream when the client disconnects.
    req.signal.addEventListener("abort", () => abortController.abort(), { once: true });

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (chunk: string) =>
          controller.enqueue(encoder.encode(chunk));

        try {
          for await (const progress of mirofish.streamProgress(
            id,
            abortController.signal,
          )) {
            enqueue(sseEvent("progress", JSON.stringify(progress)));

            // Handle terminal states from MiroFish.
            if (progress.status === "completed") {
              await db.simulationRecord.update({
                where: { id },
                data: {
                  status: "completed",
                  completedAt: new Date(),
                  topInsight: undefined, // updated by getResults later
                },
              });

              const runtimeMs =
                sim.startedAt ? Date.now() - sim.startedAt.getTime() : 0;
              void track(
                "fate_simulation_completed",
                {
                  scenario_id: sim.scenarioId,
                  simulation_id: id,
                  actual_runtime: Math.round(runtimeMs / 1000),
                },
                { userId: user.id },
              );

              enqueue(
                sseEvent("done", JSON.stringify({ simulation_id: id, status: "completed" })),
              );
              break;
            }

            if (progress.status === "failed") {
              await db.simulationRecord.update({
                where: { id },
                data: { status: "failed" },
              });
              enqueue(
                sseEvent("error", JSON.stringify({ simulation_id: id, status: "failed" })),
              );
              break;
            }

            if (progress.status === "cancelled") {
              await db.simulationRecord.update({
                where: { id },
                data: { status: "cancelled" },
              });
              enqueue(
                sseEvent(
                  "error",
                  JSON.stringify({ simulation_id: id, status: "cancelled" }),
                ),
              );
              break;
            }
          }
        } catch (err) {
          // Client abort — just close cleanly.
          if (req.signal.aborted || abortController.signal.aborted) {
            controller.close();
            return;
          }
          // MiroFish error — update DB status and emit error event.
          try {
            await db.simulationRecord.update({
              where: { id },
              data: { status: "failed", errorMessage: "stream_error" },
            });
          } catch {
            // Best-effort
          }
          enqueue(
            sseEvent(
              "error",
              JSON.stringify({
                simulation_id: id,
                status: "failed",
                message: "upstream stream error",
              }),
            ),
          );
        } finally {
          controller.close();
        }
      },
      cancel() {
        abortController.abort();
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  },
);
