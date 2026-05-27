import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/errors";
import { requireAdminOrSupport } from "@/lib/guards";
import { db } from "@/lib/db";

async function checkPostgres() {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, error: String(e) };
  }
}

async function checkRedis() {
  const start = Date.now();
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return { ok: false, latencyMs: 0, error: "UPSTASH_REDIS_REST_URL not configured" };
  }
  try {
    const res = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.result === "PONG") {
      return { ok: true, latencyMs: Date.now() - start };
    }
    return { ok: false, latencyMs: Date.now() - start, error: "Unexpected ping response" };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, error: String(e) };
  }
}

async function checkMirofish() {
  const start = Date.now();
  const mirofishUrl = process.env.MIROFISH_BASE_URL ?? process.env.MIROFISH_URL ?? "http://localhost:8080";
  try {
    const res = await fetch(`${mirofishUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { ok: true, latencyMs: Date.now() - start };
    return { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, error: String(e) };
  }
}

async function checkStripe() {
  const start = Date.now();
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { ok: false, latencyMs: 0, error: "STRIPE_SECRET_KEY not configured" };
  }
  try {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Stripe-Version": "2024-06-20",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { ok: true, latencyMs: Date.now() - start };
    const body = await res.json().catch(() => ({}));
    return { ok: false, latencyMs: Date.now() - start, error: body.error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, error: String(e) };
  }
}

async function getRunningSimulations() {
  const sims = await db.simulationRecord.findMany({
    where: { status: { in: ["queued", "running"] } },
    select: { id: true },
  });
  return sims.map((s) => s.id);
}

export const GET = withErrorHandling(async () => {
  await requireAdminOrSupport();

  const [postgres, redis, mirofish, stripe, runningSimIds] = await Promise.allSettled([
    checkPostgres(),
    checkRedis(),
    checkMirofish(),
    checkStripe(),
    getRunningSimulations(),
  ]);

  function unwrap<T>(r: PromiseSettledResult<T>, fallback: T): T {
    return r.status === "fulfilled" ? r.value : fallback;
  }

  return NextResponse.json({
    services: {
      postgres: unwrap(postgres, { ok: false, latencyMs: 0, error: "check failed" }),
      redis: unwrap(redis, { ok: false, latencyMs: 0, error: "check failed" }),
      mirofish: unwrap(mirofish, { ok: false, latencyMs: 0, error: "check failed" }),
      stripe: unwrap(stripe, { ok: false, latencyMs: 0, error: "check failed" }),
    },
    runningSimIds: unwrap(runningSimIds, []),
    runningSimCount: unwrap(runningSimIds, []).length,
    checkedAt: new Date().toISOString(),
  });
});
