/**
 * GET /api/cron/cleanup-shares
 *
 * Vercel cron job (runs at 04:00 UTC daily).
 * Deletes expired and revoked share links after a 7-day grace period.
 * The grace period allows expired links to show "This link has expired"
 * rather than "Not found".
 *
 * Auth: Bearer CRON_SECRET
 * Returns: { ok: true, deletedExpired: N, deletedRevoked: M }
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandling, ForbiddenError } from "@/lib/errors";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const GET = withErrorHandling(async (request: Request) => {
  // Validate bearer token.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const provided = authHeader?.replace(/^Bearer\s+/i, "");

  if (!cronSecret || !provided || provided !== cronSecret) {
    throw new ForbiddenError("cron_auth_required");
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

  // Delete expired shares that are past their 7-day grace period.
  const expiredResult = await db.share.deleteMany({
    where: {
      expiresAt: { lt: now },
      createdAt: { lt: sevenDaysAgo },
    },
  });

  // Delete revoked shares where revokedAt is >7 days ago.
  const revokedResult = await db.share.deleteMany({
    where: {
      revokedAt: { not: null, lt: sevenDaysAgo },
    },
  });

  console.log(
    `[cron/cleanup-shares] Deleted ${expiredResult.count} expired + ${revokedResult.count} revoked shares`,
  );

  return NextResponse.json({
    ok: true,
    deletedExpired: expiredResult.count,
    deletedRevoked: revokedResult.count,
  });
});
