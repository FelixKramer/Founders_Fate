/**
 * GET /api/cron/re-engagement-emails
 *
 * Vercel cron job (runs at 10:00 UTC daily).
 *
 * Sends re-engagement emails to users who:
 *   1. Have exactly 1 completed simulation
 *   2. That simulation was created 7–8 days ago (Valley of Despair window)
 *   3. Have marketingEmails = true on their profile
 *   4. Have not already received a re-engagement email
 *
 * Sets Profile.reEngagementEmailSentAt to prevent duplicate sends.
 *
 * Auth: Bearer CRON_SECRET
 * Returns: { ok: true, emailsSent: N }
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandling, ForbiddenError } from "@/lib/errors";
import { sendReEngagementEmail } from "@/lib/email";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const EIGHT_DAYS_MS = 8 * 24 * 60 * 60 * 1000;

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
  const eightDaysAgo = new Date(now.getTime() - EIGHT_DAYS_MS);

  // Find users whose first (and only) completed simulation is in the 7–8 day window.
  // We query profiles that:
  //   - Have marketingEmails = true
  //   - Have not yet had a re-engagement email sent
  //   - Have exactly 1 completed simulation in the 7–8 day window
  const eligibleProfiles = await db.profile.findMany({
    where: {
      marketingEmails: true,
      reEngagementEmailSentAt: null,
    },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  let emailsSent = 0;

  for (const profile of eligibleProfiles) {
    // Count completed simulations for this user.
    const completedCount = await db.simulationRecord.count({
      where: {
        userId: profile.userId,
        status: "completed",
        deletedAt: null,
      },
    });

    // Must have exactly 1 completed simulation overall.
    if (completedCount !== 1) continue;

    // That single simulation must be in the 7–8 day window.
    const recentSim = await db.simulationRecord.findFirst({
      where: {
        userId: profile.userId,
        status: "completed",
        createdAt: {
          gte: eightDaysAgo,
          lt: sevenDaysAgo,
        },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!recentSim) continue;

    // Send the re-engagement email.
    try {
      await sendReEngagementEmail({
        email: profile.user.email,
        name: profile.user.name,
      });

      // Mark as sent to prevent duplicate sends.
      await db.profile.update({
        where: { userId: profile.userId },
        data: { reEngagementEmailSentAt: now },
      });

      emailsSent += 1;
      console.log(`[cron/re-engagement-emails] Email sent to user ${profile.userId}`);
    } catch (err) {
      // Log but continue — one failure shouldn't block the rest.
      console.error(
        `[cron/re-engagement-emails] Failed to send email to user ${profile.userId}:`,
        err,
      );
    }
  }

  console.log(`[cron/re-engagement-emails] Done. Sent ${emailsSent} emails.`);

  return NextResponse.json({ ok: true, emailsSent });
});
