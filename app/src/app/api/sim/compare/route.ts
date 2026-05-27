/**
 * GET /api/sim/compare?a=simId&b=simId
 *
 * Returns the simulation records and results for two simulations owned by the
 * authenticated user. Both must be completed and use the same scenarioId.
 *
 * Auth: requireSession()
 * Response: {
 *   a: { simulation: SimulationRecord, results: SimulationResults },
 *   b: { simulation: SimulationRecord, results: SimulationResults },
 * }
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import {
  withErrorHandling,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { mirofish } from "@/lib/mirofish";

export const GET = withErrorHandling(async (req: Request) => {
  const user = await requireSession();

  const url = new URL(req.url);
  const aId = url.searchParams.get("a");
  const bId = url.searchParams.get("b");

  if (!aId || !bId) {
    throw new ValidationError("Both ?a= and ?b= simulation IDs are required");
  }
  if (aId === bId) {
    throw new ValidationError("Cannot compare a simulation with itself");
  }

  // Fetch both simulation records in parallel.
  const [simA, simB] = await Promise.all([
    db.simulationRecord.findFirst({
      where: { id: aId, userId: user.id },
      select: {
        id: true,
        scenarioId: true,
        decisionOptionId: true,
        status: true,
        jobRef: true,
        createdAt: true,
      },
    }),
    db.simulationRecord.findFirst({
      where: { id: bId, userId: user.id },
      select: {
        id: true,
        scenarioId: true,
        decisionOptionId: true,
        status: true,
        jobRef: true,
        createdAt: true,
      },
    }),
  ]);

  if (!simA) throw new NotFoundError(`simulation A (${aId}) not found`);
  if (!simB) throw new NotFoundError(`simulation B (${bId}) not found`);

  if (simA.status !== "completed") {
    throw new ValidationError("Simulation A is not yet completed");
  }
  if (simB.status !== "completed") {
    throw new ValidationError("Simulation B is not yet completed");
  }

  if (simA.scenarioId !== simB.scenarioId) {
    throw new ValidationError(
      "Both simulations must use the same scenario to be compared",
    );
  }

  // Fetch results from MiroFish in parallel.
  const [resultsA, resultsB] = await Promise.all([
    mirofish.getResults(simA.jobRef ?? simA.id),
    mirofish.getResults(simB.jobRef ?? simB.id),
  ]);

  return NextResponse.json({
    a: { simulation: simA, results: resultsA },
    b: { simulation: simB, results: resultsB },
  });
});
