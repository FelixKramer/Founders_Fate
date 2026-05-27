/**
 * GET /api/profile/dna/status
 *
 * Returns the current DNA generation status for the authenticated user.
 *
 * Response shape:
 *   { status: 'not_started'|'queued'|'running'|'completed'|'failed', report?: DNAReport, simulations_needed?: number }
 *
 * Flow:
 *  1. If no dnaJobId on Profile: check sim count, return not_started + simulations_needed.
 *  2. If dnaJobId exists: poll MiroFish GET /internal/v1/dna/status/<job_id>.
 *  3. If MiroFish reports completed: fetch report from GET /internal/v1/dna/report/<userId>.
 *     Mark dnaReportReady=true + dnaReportAt on Profile (idempotent).
 *
 * Auth: requireSession()
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/guards";
import { withErrorHandling } from "@/lib/errors";

const MIROFISH_URL = process.env.MIROFISH_URL ?? "http://localhost:8000";
const MIROFISH_TOKEN = process.env.MIROFISH_INTERNAL_TOKEN ?? "";

const REQUIRED_SCENARIOS = 3;

export type DNABias = {
  name: string;
  description: string;
  evidence: string;
  severity: "low" | "medium" | "high";
};

export type DNAPattern = {
  name: string;
  description: string;
  frequency: "rare" | "occasional" | "consistent";
};

export type DNARecommendation = {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
};

export type DNAReport = {
  job_id: string;
  user_id: string;
  generated_at: number;
  simulation_count: number;
  cognitive_biases: DNABias[];
  decision_patterns: DNAPattern[];
  archetype_consistency: number;
  blind_spots: string[];
  recommendations: DNARecommendation[];
  contradiction_narrative: string;
  overall_summary: string;
  risk_profile: "aggressive" | "balanced" | "conservative";
};

type DNAStatusResponse = {
  status: "not_started" | "queued" | "running" | "completed" | "failed";
  report?: DNAReport;
  simulations_needed?: number;
  error?: string;
};

async function mirofishGet(path: string): Promise<Response | null> {
  try {
    return await fetch(`${MIROFISH_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${MIROFISH_TOKEN}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }
}

export const GET = withErrorHandling(async () => {
  const user = await requireSession();

  // Load the user's profile to get DNA job tracking fields.
  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: {
      dnaJobId: true,
      dnaJobStartedAt: true,
      dnaReportReady: true,
      dnaReportAt: true,
    },
  });

  // No profile yet or no job started — check sim count.
  if (!profile?.dnaJobId) {
    const completedSims = await db.simulationRecord.findMany({
      where: { userId: user.id, status: "completed" },
      select: { scenarioId: true },
      distinct: ["scenarioId"],
    });
    const distinctCount = completedSims.length;
    const simulations_needed = Math.max(0, REQUIRED_SCENARIOS - distinctCount);

    const response: DNAStatusResponse = {
      status: "not_started",
      simulations_needed,
    };
    return NextResponse.json(response);
  }

  // If we already know the report is ready, fetch and return it directly.
  if (profile.dnaReportReady) {
    const reportRes = await mirofishGet(
      `/internal/v1/dna/report/${encodeURIComponent(user.id)}`,
    );
    if (reportRes?.ok) {
      const report = (await reportRes.json()) as DNAReport;
      return NextResponse.json({ status: "completed", report } satisfies DNAStatusResponse);
    }
    // Report marked ready but MiroFish returned 404/error — return completed without report.
    return NextResponse.json({ status: "completed" } satisfies DNAStatusResponse);
  }

  // Poll MiroFish for job status.
  const statusRes = await mirofishGet(
    `/internal/v1/dna/status/${encodeURIComponent(profile.dnaJobId)}`,
  );

  if (!statusRes || !statusRes.ok) {
    // MiroFish unreachable or job not found — treat as queued.
    return NextResponse.json({ status: "queued" } satisfies DNAStatusResponse);
  }

  const jobStatus = (await statusRes.json()) as {
    status: string;
    result: DNAReport | null;
    error: string | null;
  };

  const mfStatus = jobStatus.status as
    | "queued"
    | "running"
    | "completed"
    | "failed";

  if (mfStatus === "completed" && jobStatus.result) {
    // Mark report ready on Profile (idempotent).
    await db.profile.update({
      where: { userId: user.id },
      data: {
        dnaReportReady: true,
        dnaReportAt: new Date(),
        dnaReportAvailable: true,
      },
    });

    return NextResponse.json({
      status: "completed",
      report: jobStatus.result,
    } satisfies DNAStatusResponse);
  }

  if (mfStatus === "failed") {
    return NextResponse.json({
      status: "failed",
      error: jobStatus.error ?? "Unknown error",
    } satisfies DNAStatusResponse);
  }

  // queued | running
  return NextResponse.json({
    status: mfStatus === "running" ? "running" : "queued",
  } satisfies DNAStatusResponse);
});
