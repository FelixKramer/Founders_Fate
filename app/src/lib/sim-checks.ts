/**
 * Reusable pre-flight checks for /api/sim/run.
 *
 * Keeps the route handler thin and makes unit testing each check in
 * isolation straightforward.
 */

import { db } from "@/lib/db";
import {
  TierRestrictedError,
  TooManyActiveSimsError,
  DuplicateSimulationError,
} from "@/lib/errors";
import { MONTHLY_SIM_QUOTA, type Tier } from "@/lib/tier";
import { createHash } from "crypto";

// How many active sims a single user may have in flight at once.
export const CONCURRENT_SIM_LIMIT = 5;

// ── Monthly quota ──────────────────────────────────────────────────────────

/**
 * Throws TierRestrictedError if the user has consumed their monthly
 * simulation quota. Free tier = 3/month; pro + enterprise = unlimited.
 */
export async function checkMonthlyQuota(
  userId: string,
  tier: string,
): Promise<void> {
  const quota = MONTHLY_SIM_QUOTA[(tier as Tier) ?? "free"] ?? MONTHLY_SIM_QUOTA.free;
  if (quota === -1) return; // unlimited tier

  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const count = await db.simulationRecord.count({
    where: {
      userId,
      createdAt: { gte: start },
      status: { notIn: ["failed", "cancelled"] },
    },
  });

  if (count >= quota) {
    throw new TierRestrictedError(
      tier,
      "pro",
    );
  }
}

// ── Concurrency limit ──────────────────────────────────────────────────────

/**
 * Throws TooManyActiveSimsError (429 with Retry-After: 60) if the user
 * already has CONCURRENT_SIM_LIMIT sims in queued or running state.
 */
export async function checkConcurrencyLimit(userId: string): Promise<void> {
  const active = await db.simulationRecord.count({
    where: {
      userId,
      status: { in: ["queued", "running"] },
    },
  });

  if (active >= CONCURRENT_SIM_LIMIT) {
    throw new TooManyActiveSimsError(active, CONCURRENT_SIM_LIMIT, 60);
  }
}

// ── Duplicate detection ────────────────────────────────────────────────────

/**
 * Throws DuplicateSimulationError if the user already has a queued or
 * running sim for the same scenarioId + decisionOptionId combination.
 */
export async function checkDuplicate(
  userId: string,
  scenarioId: string,
  decisionOptionId: string,
): Promise<void> {
  const existing = await db.simulationRecord.findFirst({
    where: {
      userId,
      scenarioId,
      decisionOptionId,
      status: { in: ["queued", "running"] },
    },
    select: { id: true },
  });

  if (existing) {
    throw new DuplicateSimulationError(existing.id);
  }
}

// ── Variable hash helper ───────────────────────────────────────────────────

/**
 * Produce a stable SHA-256 hex hash from a variables object.
 * Keys are sorted for determinism.
 */
export function hashVariables(variables: Record<string, unknown>): string {
  const sorted = Object.fromEntries(
    Object.entries(variables).sort(([a], [b]) => a.localeCompare(b)),
  );
  return createHash("sha256")
    .update(JSON.stringify(sorted))
    .digest("hex");
}
