/**
 * GET /api/scenarios
 *
 * Public endpoint (no auth required) that returns the scenario library.
 * Optional ?archetype= query param filters by archetype_compatibility.
 *
 * Auth: optionalSession — callable logged-out; session used for future
 * personalisation (e.g. highlighting compatible scenarios).
 *
 * Caching: Upstash Redis for 1 hour. The scenario list is static between
 * deploys, making it a perfect cache candidate. Falls back gracefully if
 * Redis is unavailable.
 */

import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/errors";
import { optionalSession } from "@/lib/guards";
import { ALL_SCENARIOS, getScenariosForArchetype } from "@/lib/scenarios";

// ISR: CDN-level cache revalidation every hour for requests that bypass Redis.
export const revalidate = 3600;

// Lazy Redis singleton — avoids import errors when env vars are absent in tests.
let _redis: import("@upstash/redis").Redis | null | undefined;
async function getRedis(): Promise<import("@upstash/redis").Redis | null> {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    _redis = null;
    return null;
  }
  try {
    const { Redis } = await import("@upstash/redis");
    _redis = new Redis({ url, token });
  } catch {
    _redis = null;
  }
  return _redis;
}

const CACHE_KEY = "ff:scenarios:all";
const CACHE_TTL = 3600; // 1 hour in seconds

export const GET = withErrorHandling(async (req: Request) => {
  // Session is read but not required — future: personalise ordering.
  await optionalSession();

  const { searchParams } = new URL(req.url);
  const archetype = searchParams.get("archetype");

  // Only cache the unfiltered list — archetype-filtered variants are cheap
  // to compute and have too many permutations to cache individually.
  if (!archetype) {
    const redis = await getRedis();
    if (redis) {
      const cached = await redis.get<unknown>(CACHE_KEY).catch(() => null);
      if (cached !== null && cached !== undefined) {
        return NextResponse.json(
          { scenarios: cached },
          {
            headers: {
              "X-Cache": "HIT",
              "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
            },
          },
        );
      }
    }

    const scenarios = ALL_SCENARIOS;

    // Fire-and-forget cache population — never let Redis block the response.
    if (redis) {
      redis.setex(CACHE_KEY, CACHE_TTL, scenarios).catch(() => {});
    }

    return NextResponse.json(
      { scenarios },
      {
        headers: {
          "X-Cache": "MISS",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
        },
      },
    );
  }

  // Archetype-filtered path — no Redis cache, still add CDN headers.
  const scenarios = getScenariosForArchetype(archetype);
  return NextResponse.json(
    { scenarios },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
      },
    },
  );
});
