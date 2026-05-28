/**
 * Rate limiting (PRD §S-04, §6.2).
 *
 * Defaults: 60 req/min for safe reads, 10 req/min for writes,
 * 10 req/sec/IP on the public share-link endpoint.
 *
 * Backed by Upstash Redis in prod (REST API, edge-compatible).
 * Falls back to an in-process token bucket when UPSTASH_REDIS_REST_URL
 * is absent so `next dev` works without any infra.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RateLimitedError } from "@/lib/errors";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const upstash = url && token ? new Redis({ url, token }) : null;

// In-memory fallback. Per-process, not shared between workers — fine for local dev only.
// Bounded to MAX_BUCKETS entries; expired buckets are evicted on every write to prevent
// unbounded growth under sustained traffic from many distinct IPs.
class MemoryLimiter {
  private static readonly MAX_BUCKETS = 10_000;
  private buckets = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private maxCount: number,
    private windowMs: number,
  ) {}

  /** Evict all expired buckets. Runs O(N) but is bounded by MAX_BUCKETS. */
  private evictExpired(now: number): void {
    for (const [k, v] of this.buckets) {
      if (v.resetAt < now) this.buckets.delete(k);
    }
  }

  async limit(key: string): Promise<{ success: boolean; reset: number; remaining: number }> {
    const now = Date.now();
    const b = this.buckets.get(key);

    if (!b || b.resetAt < now) {
      // Evict expired entries before inserting a new bucket so the map stays bounded.
      if (this.buckets.size >= MemoryLimiter.MAX_BUCKETS) this.evictExpired(now);
      // If still at cap after eviction (all live), drop the oldest entry.
      if (this.buckets.size >= MemoryLimiter.MAX_BUCKETS) {
        const oldest = this.buckets.keys().next().value;
        if (oldest !== undefined) this.buckets.delete(oldest);
      }
      const reset = now + this.windowMs;
      this.buckets.set(key, { count: 1, resetAt: reset });
      return { success: true, reset, remaining: this.maxCount - 1 };
    }

    if (b.count >= this.maxCount) {
      return { success: false, reset: b.resetAt, remaining: 0 };
    }
    b.count += 1;
    return { success: true, reset: b.resetAt, remaining: this.maxCount - b.count };
  }
}

type Limiter = {
  limit(key: string): Promise<{ success: boolean; reset: number; remaining: number }>;
};

function build(limit: number, windowSec: number, namespace: string): Limiter {
  if (upstash) {
    return new Ratelimit({
      redis: upstash,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      analytics: true,
      prefix: `ff:rl:${namespace}`,
    });
  }
  return new MemoryLimiter(limit, windowSec * 1000);
}

// Pre-built limiters (singletons across the process).
export const limiters = {
  /** 60/min — for GETs that don't hit upstream services hard. */
  read: build(60, 60, "read"),
  /** 10/min — for POST/PUT/DELETE that mutate state. */
  write: build(10, 60, "write"),
  /** 10/sec — for the public /sim/share/<code> endpoint, per IP. */
  publicShare: build(10, 1, "share"),
  /** 10/hour — CAPTCHA-equivalent: triggers extra friction on /sim/run from an IP. */
  simBurst: build(10, 60 * 60, "sim_burst"),
};

/**
 * Throws RateLimitedError if the limiter rejects. Use inside route handlers.
 *
 * @param limiter one of `limiters.*`
 * @param key uniquely identifies the bucket — typically `userId` or `ip:<addr>`
 */
export async function enforceLimit(limiter: Limiter, key: string): Promise<void> {
  const { success, reset } = await limiter.limit(key);
  if (success) return;
  const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  throw new RateLimitedError(retryAfterSeconds);
}

/**
 * Pull a usable identifier from a Next.js Request — prefers the userId
 * when authenticated, otherwise falls back to the IP. IPv4/IPv6 sourced
 * from Vercel/Cloudflare/Fly headers if present.
 */
export function rateLimitKey(req: Request, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}
