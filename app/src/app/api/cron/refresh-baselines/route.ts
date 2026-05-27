/**
 * GET /api/cron/refresh-baselines
 *
 * Vercel cron job (runs at 03:00 UTC daily). Validates bearer token from
 * CRON_SECRET env var. Counts completed SimulationRecords that haven't been
 * updated in 30+ days — real refresh logic wired in M5.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandling, ForbiddenError } from "@/lib/errors";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const GET = withErrorHandling(async (request: Request) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const provided = authHeader?.replace(/^Bearer\s+/i, "");

  if (!cronSecret || !provided || provided !== cronSecret) {
    throw new ForbiddenError("cron_auth_required");
  }

  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);

  const count = await db.simulationRecord.count({
    where: {
      status: "completed",
      updatedAt: { lt: thirtyDaysAgo },
      baselineStale: false,
    },
  });

  console.log(`[cron/refresh-baselines] ${count} simulations would be refreshed`);

  return NextResponse.json({ ok: true, count });
});
