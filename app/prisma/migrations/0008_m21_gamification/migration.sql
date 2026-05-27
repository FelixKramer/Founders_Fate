-- M21 Gamification: Badge, UserBadge, Streak tables + canonical badge seed

-- CreateTable Badge
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Badge_slug_key" ON "Badge"("slug");

-- CreateTable UserBadge
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey"
    FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable Streak
CREATE TABLE "Streak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Streak_userId_key" ON "Streak"("userId");

ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed canonical badges
INSERT INTO "Badge" ("id", "slug", "name", "description", "emoji", "category", "createdAt") VALUES
('badge_first_sim',        'first_simulation',    'First Steps',         'Ran your first simulation',                        '🚀', 'milestone', NOW()),
('badge_third_sim',        'third_simulation',    'Pattern Seeker',      'Ran 3 simulations — DNA profile unlocked',         '🧬', 'milestone', NOW()),
('badge_tenth_sim',        'tenth_simulation',    'Scenario Veteran',    'Ran 10 simulations',                               '⚡', 'milestone', NOW()),
('badge_dna_unlocked',     'dna_unlocked',        'Self-Aware Founder',  'Decision DNA report generated',                    '🧠', 'milestone', NOW()),
('badge_share_created',    'share_created',       'Knowledge Sharer',    'Shared a simulation result publicly',              '🔗', 'social',    NOW()),
('badge_compare_run',      'compare_run',         'Sharp Eye',           'Compared two simulations side by side',            '🔍', 'milestone', NOW()),
('badge_pro_upgrade',      'pro_upgrade',         'Committed Founder',   'Upgraded to Pro tier',                             '⭐', 'tier',      NOW()),
('badge_streak_3',         'streak_3',            'Building Momentum',   '3-day simulation streak',                          '🔥', 'streak',    NOW()),
('badge_streak_7',         'streak_7',            'On a Roll',           '7-day simulation streak',                          '💪', 'streak',    NOW()),
('badge_streak_30',        'streak_30',           'Unstoppable',         '30-day simulation streak',                         '🏆', 'streak',    NOW()),
('badge_premortem',        'premortem_run',       'Risk Archaeologist',  'Ran an enterprise pre-mortem analysis',            '📋', 'milestone', NOW()),
('badge_marketplace_pub',  'marketplace_publish', 'Community Builder',   'Published a scenario to the marketplace',          '🌟', 'social',    NOW());
