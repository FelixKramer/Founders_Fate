/**
 * Achievement award engine — M21 Gamification
 */

import { db } from "@/lib/db";
import { track } from "@/lib/analytics";

export const BADGE_SLUGS = {
  FIRST_SIM: "first_simulation",
  THIRD_SIM: "third_simulation",
  TENTH_SIM: "tenth_simulation",
  DNA_UNLOCKED: "dna_unlocked",
  SHARE_CREATED: "share_created",
  COMPARE_RUN: "compare_run",
  PRO_UPGRADE: "pro_upgrade",
  STREAK_3: "streak_3",
  STREAK_7: "streak_7",
  STREAK_30: "streak_30",
  PREMORTEM: "premortem_run",
  MARKETPLACE_PUB: "marketplace_publish",
} as const;

export type BadgeSlug = (typeof BADGE_SLUGS)[keyof typeof BADGE_SLUGS];

/**
 * Award a badge to a user if not already awarded.
 * Returns the new UserBadge (with badge data) or null if already earned.
 */
export async function awardBadge(
  userId: string,
  slug: BadgeSlug,
): Promise<{ badge: { name: string; emoji: string } } | null> {
  try {
    const badge = await db.badge.findUnique({ where: { slug } });
    if (!badge) return null;

    const userBadge = await db.userBadge.create({
      data: { userId, badgeId: badge.id },
      include: { badge: true },
    });

    await track("fate_badge_awarded", { userId, badgeSlug: slug, badgeName: badge.name });
    return userBadge;
  } catch {
    // @@unique constraint violation = already awarded — that's fine
    return null;
  }
}

/**
 * Check the user's completed simulation count and award milestone badges.
 * Returns slugs of any newly awarded badges.
 */
export async function checkSimulationMilestones(userId: string): Promise<BadgeSlug[]> {
  const count = await db.simulationRecord.count({
    where: { userId, status: "completed", deletedAt: null },
  });

  const awarded: BadgeSlug[] = [];

  if (count >= 1) {
    const r = await awardBadge(userId, BADGE_SLUGS.FIRST_SIM);
    if (r) awarded.push(BADGE_SLUGS.FIRST_SIM);
  }
  if (count >= 3) {
    const r = await awardBadge(userId, BADGE_SLUGS.THIRD_SIM);
    if (r) awarded.push(BADGE_SLUGS.THIRD_SIM);
  }
  if (count >= 10) {
    const r = await awardBadge(userId, BADGE_SLUGS.TENTH_SIM);
    if (r) awarded.push(BADGE_SLUGS.TENTH_SIM);
  }

  return awarded;
}

/**
 * Update the user's daily streak after a simulation completion.
 * Returns the new streak count and any newly awarded streak badges.
 */
export async function updateStreak(
  userId: string,
): Promise<{ streak: number; newBadges: BadgeSlug[] }> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  const existing = await db.streak.findUnique({ where: { userId } });

  let currentStreak = 1;
  let longestStreak = 1;

  if (existing) {
    const lastActive = new Date(existing.lastActiveAt);
    const lastActiveDay = new Date(
      lastActive.getFullYear(),
      lastActive.getMonth(),
      lastActive.getDate(),
    );

    if (lastActiveDay.getTime() === todayStart.getTime()) {
      // Already active today — no change
      currentStreak = existing.currentStreak;
      longestStreak = existing.longestStreak;
    } else if (lastActiveDay.getTime() === yesterdayStart.getTime()) {
      // Consecutive day — extend streak
      currentStreak = existing.currentStreak + 1;
      longestStreak = Math.max(existing.longestStreak, currentStreak);
    } else {
      // Streak broken
      currentStreak = 1;
      longestStreak = Math.max(existing.longestStreak, 1);
    }
  }

  await db.streak.upsert({
    where: { userId },
    create: { userId, currentStreak, longestStreak, lastActiveAt: now },
    update: { currentStreak, longestStreak, lastActiveAt: now },
  });

  const newBadges: BadgeSlug[] = [];
  if (currentStreak >= 3) {
    const r = await awardBadge(userId, BADGE_SLUGS.STREAK_3);
    if (r) newBadges.push(BADGE_SLUGS.STREAK_3);
  }
  if (currentStreak >= 7) {
    const r = await awardBadge(userId, BADGE_SLUGS.STREAK_7);
    if (r) newBadges.push(BADGE_SLUGS.STREAK_7);
  }
  if (currentStreak >= 30) {
    const r = await awardBadge(userId, BADGE_SLUGS.STREAK_30);
    if (r) newBadges.push(BADGE_SLUGS.STREAK_30);
  }

  return { streak: currentStreak, newBadges };
}
