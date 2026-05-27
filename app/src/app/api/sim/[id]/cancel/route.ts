/**
 * POST /api/sim/:id/cancel
 *
 * Best-effort cancellation of a queued or running simulation.
 * Returns 404 (not 403) for non-owned simulations (IDOR protection).
 * Returns 409 if the simulation is already in a terminal state.
 *
 * Auth: requireSession()
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { withErrorHandling, NotFoundError, ConflictError } from "@/lib/errors";
import { enforceLimit, limiters, rateLimitKey } from "@/lib/rate-limit";
import { mirofish } from "@/lib/mirofish";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireSession();
    await enforceLimit(limiters.write, rateLimitKey(req, user.id));

    const { id } = await params;

    // Ownership check — return 404 for wrong owner (IDOR protection).
    const sim = await db.simulationRecord.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true, jobRef: true },
    });
    if (!sim) throw new NotFoundError("simulation not found");

    // Check that the sim is in a cancellable state.
    if (sim.status !== "queued" && sim.status !== "running") {
      throw new ConflictError(
        `simulation already in terminal state: ${sim.status}`,
      );
    }

    // Best-effort MiroFish cancellation (ignore errors).
    try {
      await mirofish.cancelSimulation(sim.jobRef ?? id);
    } catch {
      // Best-effort — proceed to mark cancelled regardless.
    }

    await db.simulationRecord.update({
      where: { id },
      data: { status: "cancelled" },
    });

    return NextResponse.json({ cancelled: true });
  },
);
