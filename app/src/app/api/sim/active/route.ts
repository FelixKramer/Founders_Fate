/**
 * GET /api/sim/active
 *
 * Returns the authenticated user's queued + running SimulationRecords.
 * Used on page load to reconnect to in-progress simulations.
 *
 * Auth: requireSession()
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { withErrorHandling } from "@/lib/errors";
import { enforceLimit, limiters, rateLimitKey } from "@/lib/rate-limit";

export const GET = withErrorHandling(async (req: Request) => {
  const user = await requireSession();
  await enforceLimit(limiters.read, rateLimitKey(req, user.id));

  const simulations = await db.simulationRecord.findMany({
    where: {
      userId: user.id,
      status: { in: ["queued", "running"] },
    },
    select: {
      id: true,
      scenarioId: true,
      decisionOptionId: true,
      status: true,
      archetype: true,
      startedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ simulations });
});
