/**
 * POST /api/profile/dna  — trigger Decision DNA report generation
 * GET  /api/profile/dna  — (not used; status is at /api/profile/dna/status)
 *
 * Auth: requireSession()
 *
 * POST flow:
 *  1. Count completed simulations across distinct scenarioIds (require >= 3).
 *  2. If < 3: return { ready: false, simulations_needed: N }.
 *  3. Build simulation_summaries from SimulationRecord rows.
 *  4. POST to MiroFish /internal/v1/dna/generate with summaries.
 *  5. Store job_id + dnaJobStartedAt on Profile.
 *  6. Return { queued: true, job_id }.
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

// ─── Types ───────────────────────────────────────────────────────────────────

type SimulationSummary = {
  simulation_id: string;
  scenario_id: string;
  archetype: string;
  decision_option_id: string;
  key_risks: string[];
  confidence_score: number;
  outcome_type: "high_risk" | "balanced" | "conservative";
};

// ─── Helper: derive outcome_type from stored record ───────────────────────────

function deriveOutcomeType(
  variables: Record<string, unknown>,
): "high_risk" | "balanced" | "conservative" {
  // Best-effort: if the simulation stored result JSON with confidence, use it.
  // Otherwise fall back to "balanced".
  const conf = typeof variables?.confidence_score === "number"
    ? (variables.confidence_score as number)
    : 0.5;
  if (conf >= 0.7) return "conservative";
  if (conf <= 0.35) return "high_risk";
  return "balanced";
}

// ─── POST ────────────────────────────────────────────────────────────────────

export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireSession();
  await enforceLimit(limiters.write, rateLimitKey(req, user.id));

  // Fetch completed simulations with distinct scenario IDs.
  const completedSims = await db.simulationRecord.findMany({
    where: {
      userId: user.id,
      status: "completed",
    },
    select: {
      id: true,
      scenarioId: true,
      decisionOptionId: true,
      archetype: true,
      variables: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Deduplicate by scenarioId (keep the most recent per scenario).
  const seenScenarios = new Set<string>();
  const distinctSims = completedSims.filter((s) => {
    if (seenScenarios.has(s.scenarioId)) return false;
    seenScenarios.add(s.scenarioId);
    return true;
  });

  const distinctCount = distinctSims.length;

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

  // Build simulation_summaries payload for MiroFish.
  const simulation_summaries: SimulationSummary[] = distinctSims.map((s) => {
    const vars = (s.variables as Record<string, unknown>) ?? {};
    const keyRisks = Array.isArray(vars.key_risks)
      ? (vars.key_risks as string[]).slice(0, 5)
      : [];
    const confidenceScore =
      typeof vars.confidence_score === "number"
        ? (vars.confidence_score as number)
        : 0.5;

    return {
      simulation_id: s.id,
      scenario_id: s.scenarioId,
      archetype: s.archetype ?? "unknown",
      decision_option_id: s.decisionOptionId ?? "unknown",
      key_risks: keyRisks,
      confidence_score: confidenceScore,
      outcome_type: deriveOutcomeType(vars),
    };
  });

  // POST to MiroFish DNA generation endpoint.
  let jobId: string | null = null;
  try {
    const mfRes = await fetch(`${MIROFISH_URL}/internal/v1/dna/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MIROFISH_TOKEN}`,
      },
      body: JSON.stringify({
        user_id: user.id,
        simulation_summaries,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (mfRes.ok) {
      const mfBody = await mfRes.json().catch(() => ({}));
      jobId = (mfBody as { job_id?: string }).job_id ?? null;
    } else {
      // Non-2xx from MiroFish — still record that we tried.
      const errText = await mfRes.text().catch(() => "");
      console.warn(
        `[dna/route] MiroFish returned ${mfRes.status}: ${errText.slice(0, 200)}`,
      );
    }
  } catch (err) {
    // Network error — log and continue; job_id stays null.
    console.warn("[dna/route] MiroFish unreachable:", err);
  }

  // Persist job_id on Profile regardless of MiroFish outcome.
  await db.profile.update({
    where: { userId: user.id },
    data: {
      ...(jobId ? { dnaJobId: jobId } : {}),
      dnaJobStartedAt: new Date(),
    },
  });

  void track(
    "fate_dna_triggered",
    { user_id: user.id, distinct_scenarios: distinctCount },
    { userId: user.id },
  );

  return NextResponse.json(
    { queued: true, job_id: jobId },
    { status: 202 },
  );
});
