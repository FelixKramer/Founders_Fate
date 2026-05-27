/**
 * GET /api/sim/:id/results
 *
 * Returns the completed simulation results from MiroFish. Returns 404
 * for both non-existent and wrong-owner simulations (IDOR protection).
 *
 * Auth: requireSession()
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { withErrorHandling, NotFoundError } from "@/lib/errors";
import { enforceLimit, limiters, rateLimitKey } from "@/lib/rate-limit";
import { track } from "@/lib/analytics";
import { mirofish } from "@/lib/mirofish";

export const GET = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireSession();
    await enforceLimit(limiters.read, rateLimitKey(req, user.id));

    const { id } = await params;

    // Return 404 even if the sim exists but belongs to someone else (IDOR protection).
    const sim = await db.simulationRecord.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true, scenarioId: true, jobRef: true },
    });
    if (!sim) throw new NotFoundError("simulation not found");

    // If not yet complete, return 202 with current status.
    if (sim.status !== "completed") {
      return NextResponse.json(
        { status: sim.status, message: "Simulation not yet complete" },
        { status: 202 },
      );
    }

    // Fetch results from MiroFish.
    const results = await mirofish.getResults(sim.jobRef ?? id);

    // Fire-and-forget analytics.
    void track(
      "fate_results_viewed",
      { scenario_id: sim.scenarioId, simulation_id: id },
      { userId: user.id },
    );

    return NextResponse.json({ simulation_id: id, results });
  },
);
