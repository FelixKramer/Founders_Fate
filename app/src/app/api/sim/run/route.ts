/**
 * POST /api/sim/run
 *
 * Validates the user's quota + concurrency, writes a SimulationRecord,
 * then fires the simulation at MiroFish. Returns the simulation_id and
 * initial status.
 *
 * Auth:      requireSession()
 * RateLimit: write limiter (10 req/min per user)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import {
  withErrorHandling,
  ValidationError,
  NotFoundError,
  UpstreamUnavailableError,
} from "@/lib/errors";
import { enforceLimit, limiters, rateLimitKey } from "@/lib/rate-limit";
import { track } from "@/lib/analytics";
import { mirofish } from "@/lib/mirofish";
import {
  checkMonthlyQuota,
  checkConcurrencyLimit,
  checkDuplicate,
  hashVariables,
} from "@/lib/sim-checks";

// ── Request schema ───────────────────────────────────────────────────────────

const RunBody = z.object({
  scenario_id: z.string().min(1).max(200),
  decision_option_id: z.string().min(1).max(200),
  parameters: z.record(z.unknown()).default({}),
  archetype: z
    .enum(["b2b_saas", "b2c", "marketplace", "hardware", "solo"])
    .optional(),
});

// ── Handler ──────────────────────────────────────────────────────────────────

export const POST = withErrorHandling(async (req: Request) => {
  // 1. Auth
  const user = await requireSession();

  // 2. Rate limit — 10 writes/min per user
  await enforceLimit(limiters.write, rateLimitKey(req, user.id));

  // 3. Validate body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
  const parsed = RunBody.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Invalid request body",
      { issues: parsed.error.issues },
    );
  }
  const { scenario_id, decision_option_id, parameters, archetype } = parsed.data;

  // 4. Look up Profile to get archetype + confirm onboarding complete
  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: { archetype: true, onboardingCompleted: true },
  });
  if (!profile || !profile.onboardingCompleted) {
    throw new NotFoundError("Profile not found or onboarding not complete");
  }
  const effectiveArchetype =
    archetype ?? profile.archetype ?? "b2b_saas";

  // 5. Monthly quota check
  await checkMonthlyQuota(user.id, user.tier);

  // 6. Concurrency check
  await checkConcurrencyLimit(user.id);

  // 7. Duplicate rejection — same user + scenario + decision option already queued/running
  await checkDuplicate(user.id, scenario_id, decision_option_id);

  // 8. Derive simulation_id + HMAC seed
  const simulationId = `sim_${crypto.randomUUID().replace(/-/g, "")}`;
  const seedSecret = process.env.SIMULATION_SEED_SECRET ?? "dev-seed-secret";
  const seed = createHmac("sha256", seedSecret)
    .update(`${simulationId}:${user.id}`)
    .digest("hex");

  const variableHash = hashVariables(parameters as Record<string, unknown>);

  // 9. Write SimulationRecord (status = queued)
  await db.simulationRecord.create({
    data: {
      id: simulationId,
      userId: user.id,
      scenarioId: scenario_id,
      decisionOptionId: decision_option_id,
      variables: parameters,
      variableHash,
      archetype: String(effectiveArchetype),
      seed,
      status: "queued",
    },
  });

  // 10. Call MiroFish — if unavailable, mark failed and re-throw
  let mfResponse;
  try {
    mfResponse = await mirofish.startSimulation({
      userId: user.id,
      simulationId,
      scenarioId: scenario_id,
      variables: parameters as Record<string, unknown>,
      seedInput: {
        userId: user.id,
        scenarioId: scenario_id,
        ts: Date.now(),
        nonce: seed,
      },
    });
  } catch (err) {
    await db.simulationRecord.update({
      where: { id: simulationId },
      data: { status: "failed", errorMessage: "upstream_unavailable" },
    });
    if (err instanceof UpstreamUnavailableError) throw err;
    throw new UpstreamUnavailableError("mirofish", err);
  }

  // 11. Update status to running + store MiroFish job reference
  await db.simulationRecord.update({
    where: { id: simulationId },
    data: {
      status: "running",
      jobRef: mfResponse.job_id,
      startedAt: new Date(),
    },
  });

  // 12. Analytics
  void track(
    "fate_simulation_started",
    {
      scenario_id,
      archetype: String(effectiveArchetype),
      tier: user.tier,
      estimated_runtime: mfResponse.estimated_completion_seconds,
    },
    { userId: user.id },
  );

  // 13. Return
  return NextResponse.json(
    { simulation_id: simulationId, status: "running" },
    { status: 201 },
  );
});
