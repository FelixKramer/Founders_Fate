/**
 * Internal endpoint: MiroFish posts UsageLog rows here in batches.
 *
 * Auth: shared bearer token (MIROFISH_INTERNAL_TOKEN). Validated via
 * requireInternalToken — no NextAuth session involved.
 *
 * Wire format mirrors services/mirofish/backend/llm_gateway/telemetry.py.
 * If you change one side, change the other.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireInternalToken } from "@/lib/guards";
import { withErrorHandling, ValidationError } from "@/lib/errors";

const UsageEvent = z.object({
  user_id: z.string().nullable(),
  simulation_id: z.string().nullable(),
  stage: z.string(),
  model: z.string(),
  tier: z.string(),
  provider: z.string(),
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cost_usd: z.number().nonnegative(),
  latency_ms: z.number().int().nonnegative(),
  cache_hit: z.boolean(),
  attempt: z.number().int().positive(),
  error_category: z.string().nullable(),
});

const Body = z.object({
  events: z.array(UsageEvent).min(1).max(500),
});

export const POST = withErrorHandling(async (req: Request) => {
  requireInternalToken(req);
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    throw new ValidationError("invalid usage batch", { issues: parsed.error.issues });
  }
  const { events } = parsed.data;

  // Bulk insert. createMany is the fast path; we accept that a failure
  // discards the batch — MiroFish keeps these in an in-process queue
  // and we don't currently retry, so a 500 here means the events drop.
  // The /admin/llm dashboard will surface gaps via mtime checks.
  await db.usageLog.createMany({
    data: events.map((e) => ({
      userId: e.user_id ?? undefined,
      simulationId: e.simulation_id ?? undefined,
      stage: e.stage,
      model: e.model,
      tier: e.tier,
      provider: e.provider,
      inputTokens: e.input_tokens,
      outputTokens: e.output_tokens,
      costUsd: e.cost_usd,
      latencyMs: e.latency_ms,
      cacheHit: e.cache_hit,
      attempt: e.attempt,
      errorCategory: e.error_category ?? undefined,
    })),
  });

  return NextResponse.json({ ok: true, accepted: events.length });
});
