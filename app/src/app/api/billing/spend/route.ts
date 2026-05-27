/**
 * GET /api/billing/spend
 *
 * Returns the user's current-month LLM spend from Upstash Redis.
 * Redis key: ff:spend:{userId}:{YYYY-MM}
 *
 * Auth: requireSession()
 * Response: { spend_usd: number, cap_usd: number, tier: string }
 */

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/guards";
import { SPEND_CAPS } from "@/lib/tier";
import { withErrorHandling } from "@/lib/errors";

// Lazy-import Redis so the route doesn't fail if env vars aren't set in tests.
async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL ?? "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  });
}

export const GET = withErrorHandling(async () => {
  const user = await requireSession();

  const now = new Date();
  const yyyyMm = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const key = `ff:spend:${user.id}:${yyyyMm}`;

  let spendUsd = 0;
  try {
    const redis = await getRedis();
    const raw = await redis.get<string | number>(key);
    if (raw !== null && raw !== undefined) {
      spendUsd = typeof raw === "number" ? raw : parseFloat(String(raw));
      if (isNaN(spendUsd)) spendUsd = 0;
    }
  } catch {
    // Redis unavailable — return 0 spend rather than hard failing.
    spendUsd = 0;
  }

  const caps = SPEND_CAPS[user.tier];
  const capUsd = isFinite(caps.hard) ? caps.hard : 999999;

  return NextResponse.json({
    spend_usd: spendUsd,
    cap_usd: capUsd,
    tier: user.tier,
  });
});
