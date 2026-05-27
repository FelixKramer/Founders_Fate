/**
 * GET /api/achievements
 *
 * Returns the authenticated user's earned badges and current streak.
 *
 * Auth: requireSession()
 */

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/guards";
import { db } from "@/lib/db";
import { withErrorHandling } from "@/lib/errors";

export const GET = withErrorHandling(async () => {
  const user = await requireSession();

  const [userBadges, streak] = await Promise.all([
    (db as any).userBadge.findMany({
      where: { userId: user.id },
      include: { badge: true },
      orderBy: { awardedAt: "desc" },
    }),
    (db as any).streak.findUnique({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    badges: userBadges.map((ub: any) => ({
      slug: ub.badge.slug,
      name: ub.badge.name,
      description: ub.badge.description,
      emoji: ub.badge.emoji,
      category: ub.badge.category,
      awardedAt: ub.awardedAt,
    })),
    streak: streak
      ? {
          current: streak.currentStreak,
          longest: streak.longestStreak,
          lastActiveAt: streak.lastActiveAt,
        }
      : { current: 0, longest: 0, lastActiveAt: null },
  });
});
