/**
 * GET /api/cron/cleanup-simulations
 *
 * Vercel cron job (runs at 02:00 UTC daily).
 * Soft-deletes completed/failed/cancelled SimulationRecords for users who
 * have been inactive for >12 months, where the record is >90 days old.
 *
 * DNA reports are stored in the MiroFish filesystem and are NOT touched here.
 *
 * Auth: Bearer CRON_SECRET
 * Returns: { ok: true, deactivatedSimulations: N, usersProcessed: M }
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandling, ForbiddenError } from "@/lib/errors";

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

const TERMINAL_STATUSES = ["completed", "failed", "cancelled"] as const;

export const GET = withErrorHandling(async (request: Request) => {
  // Validate bearer token.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const provided = authHeader?.replace(/^Bearer\s+/i, "");

  if (!cronSecret || !provided || provided !== cronSecret) {
    throw new ForbiddenError("cron_auth_required");
  }

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getTime() - TWELVE_MONTHS_MS);
  const ninetyDaysAgo = new Date(now.getTime() - NINETY_DAYS_MS);

  // Find inactive users (not updated in 12+ months).
  const inactiveUsers = await db.user.findMany({
    where: { updatedAt: { lt: twelveMonthsAgo } },
    select: { id: true },
  });

  if (inactiveUsers.length === 0) {
    console.log("[cron/cleanup-simulations] No inactive users found");
    return NextResponse.json({ ok: true, deactivatedSimulations: 0, usersProcessed: 0 });
  }

  const inactiveUserIds = inactiveUsers.map((u) => u.id);

  // Soft-delete old terminal-state simulations for those users.
  const result = await db.simulationRecord.updateMany({
    where: {
      userId: { in: inactiveUserIds },
      status: { in: TERMINAL_STATUSES },
      createdAt: { lt: ninetyDaysAgo },
      deletedAt: null, // only touch records not already soft-deleted
    },
    data: { deletedAt: now },
  });

  console.log(
    `[cron/cleanup-simulations] Soft-deleted ${result.count} simulations for ${inactiveUsers.length} inactive users`,
  );

  return NextResponse.json({
    ok: true,
    deactivatedSimulations: result.count,
    usersProcessed: inactiveUsers.length,
  });
});
