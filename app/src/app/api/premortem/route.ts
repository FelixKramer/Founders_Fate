/**
 * POST /api/premortem
 *
 * Triggers a pre-mortem analysis on a completed simulation.
 * Enterprise-tier feature only.
 *
 * Auth: requireSession() + requireTierAtLeast('enterprise')
 * Body: { simulation_id: string, perspective: 'optimist' | 'pessimist' | 'realist' }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTierAtLeast } from "@/lib/guards";
import {
  withErrorHandling,
  ValidationError,
  NotFoundError,
  ConflictError,
  UpstreamUnavailableError,
} from "@/lib/errors";
import { enforceLimit, limiters, rateLimitKey } from "@/lib/rate-limit";
import { track } from "@/lib/analytics";

const MIROFISH_URL = process.env.MIROFISH_URL ?? "http://localhost:8000";
const MIROFISH_TOKEN = process.env.MIROFISH_INTERNAL_TOKEN ?? "";

const PremortemBody = z.object({
  simulation_id: z.string().min(1),
  perspective: z.enum(["optimist", "pessimist", "realist"]),
});

export const POST = withErrorHandling(async (req: Request) => {
  // Auth + tier gate (enterprise only)
  const user = await requireTierAtLeast("enterprise");
  await enforceLimit(limiters.write, rateLimitKey(req, user.id));

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }

  const parsed = PremortemBody.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Invalid request body",
      { issues: parsed.error.issues },
    );
  }
  const { simulation_id, perspective } = parsed.data;

  // Verify ownership + completed status (404 for wrong owner — IDOR protection).
  const sim = await db.simulationRecord.findFirst({
    where: { id: simulation_id, userId: user.id },
    select: { id: true, status: true, jobRef: true },
  });
  if (!sim) throw new NotFoundError("simulation not found");
  if (sim.status !== "completed") {
    throw new ConflictError("simulation not yet completed");
  }

  // Call MiroFish pre-mortem endpoint.
  let mfRes: Response;
  try {
    mfRes = await fetch(
      `${MIROFISH_URL}/internal/v1/simulation/${encodeURIComponent(simulation_id)}/premortem`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MIROFISH_TOKEN}`,
        },
        body: JSON.stringify({ perspective }),
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch (err) {
    throw new UpstreamUnavailableError("mirofish", err);
  }

  if (!mfRes.ok) {
    throw new UpstreamUnavailableError(
      "mirofish",
      new Error(`premortem endpoint returned ${mfRes.status}`),
    );
  }

  const result = await mfRes.json();

  void track(
    "fate_premortem_run",
    { simulation_id, perspective },
    { userId: user.id },
  );

  return NextResponse.json(result);
});
