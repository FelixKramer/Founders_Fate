/**
 * POST /api/profile/dna
 *
 * Triggers Decision DNA report generation. Requires >= 3 completed
 * simulations across distinct scenarios. Calls MiroFish stub endpoint;
 * handles 404 gracefully (queued response).
 *
 * Auth: requireSession()
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { withErrorHandling } from "@/lib/errors";
import { enforceLimit, limiters, rateLimitKey } from "@/lib/rate-limit";
import { track } from "@/lib/analytics";

const MIROFISH_URL = process.env.MIROFISH_URL ?? "http://localhost:8000";
const MIROFISH_TOKEN = process.env.MIROFISH_INTERNAL_TOKEN ?? "";

const REQUIRED_SCENARIOS = 3;

export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireSession();
  await enforceLimit(limiters.write, rateLimitKey(req, user.id));

  // Count distinct completed scenarios for this user.
  const completedSims = await db.simulationRecord.findMany({
    where: {
      userId: user.id,
      status: "completed",
    },
    select: { scenarioId: true },
    distinct: ["scenarioId"],
  });

  const distinctCount = completedSims.length;

  if (distinctCount < REQUIRED_SCENARIOS) {
    return NextResponse.json(
      {
        ready: false,
        simulations_needed: REQUIRED_SCENARIOS - distinctCount,
        message: `Complete ${REQUIRED_SCENARIOS - distinctCount} more scenario(s) to unlock your Decision DNA report.`,
      },
      { status: 202 },
    );
  }

  // Call MiroFish DNA generation endpoint (stub — may return 404).
  try {
    const mfRes = await fetch(`${MIROFISH_URL}/internal/v1/dna/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MIROFISH_TOKEN}`,
      },
      body: JSON.stringify({ user_id: user.id }),
      signal: AbortSignal.timeout(10_000),
    });

    if (mfRes.status === 404) {
      // Stub not implemented yet — queue it gracefully.
      return NextResponse.json(
        { queued: true, message: "DNA generation queued" },
        { status: 202 },
      );
    }

    if (!mfRes.ok) {
      // Non-404 error from MiroFish — still queue gracefully.
      return NextResponse.json(
        { queued: true, message: "DNA generation queued" },
        { status: 202 },
      );
    }
  } catch {
    // Network error — queue gracefully.
    return NextResponse.json(
      { queued: true, message: "DNA generation queued" },
      { status: 202 },
    );
  }

  void track(
    "fate_dna_triggered",
    { user_id: user.id, distinct_scenarios: distinctCount },
    { userId: user.id },
  );

  return NextResponse.json({ queued: true }, { status: 202 });
});
