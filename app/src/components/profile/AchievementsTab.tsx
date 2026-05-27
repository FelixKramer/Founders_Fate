"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type BadgeData = {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  awardedAt: string;
};

type StreakData = {
  current: number;
  longest: number;
  lastActiveAt: string | null;
};

const ALL_BADGES = [
  { slug: "first_simulation",    name: "First Steps",           emoji: "🚀", description: "Ran your first simulation",               category: "milestone" },
  { slug: "third_simulation",    name: "Pattern Seeker",         emoji: "🧬", description: "Ran 3 simulations",                       category: "milestone" },
  { slug: "tenth_simulation",    name: "Scenario Veteran",       emoji: "⚡", description: "Ran 10 simulations",                      category: "milestone" },
  { slug: "dna_unlocked",        name: "Self-Aware Founder",     emoji: "🧠", description: "Decision DNA generated",                  category: "milestone" },
  { slug: "share_created",       name: "Knowledge Sharer",       emoji: "🔗", description: "Shared a simulation result",              category: "social" },
  { slug: "compare_run",         name: "Sharp Eye",              emoji: "🔍", description: "Compared two simulations",                category: "milestone" },
  { slug: "pro_upgrade",         name: "Committed Founder",      emoji: "⭐", description: "Upgraded to Pro tier",                    category: "tier" },
  { slug: "streak_3",            name: "Building Momentum",      emoji: "🔥", description: "3-day streak",                            category: "streak" },
  { slug: "streak_7",            name: "On a Roll",              emoji: "💪", description: "7-day streak",                            category: "streak" },
  { slug: "streak_30",           name: "Unstoppable",            emoji: "🏆", description: "30-day streak",                           category: "streak" },
  { slug: "premortem_run",       name: "Risk Archaeologist",     emoji: "📋", description: "Ran an enterprise pre-mortem",            category: "milestone" },
  { slug: "marketplace_publish", name: "Community Builder",      emoji: "🌟", description: "Published to marketplace",               category: "social" },
];

export default function AchievementsTab() {
  const { data, isLoading } = useQuery<{ badges: BadgeData[]; streak: StreakData }>({
    queryKey: ["achievements"],
    queryFn: () => fetch("/api/achievements").then((r) => r.json()),
  });

  const earnedSlugs = new Set((data?.badges ?? []).map((b) => b.slug));
  const earned = data?.badges ?? [];
  const streak = data?.streak;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 rounded-lg bg-muted" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Streak card */}
      <Card>
        <CardContent className="pt-6 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Flame className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-3xl font-bold">{streak?.current ?? 0}</p>
              <p className="text-sm text-muted-foreground">Day streak</p>
            </div>
          </div>
          <div className="flex items-center gap-2 border-l pl-6">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="text-xl font-semibold">{streak?.longest ?? 0}</p>
              <p className="text-sm text-muted-foreground">Best streak</p>
            </div>
          </div>
          {streak?.lastActiveAt && (
            <p className="ml-auto text-xs text-muted-foreground">
              Last active {formatDistanceToNow(new Date(streak.lastActiveAt))} ago
            </p>
          )}
        </CardContent>
      </Card>

      {/* Earned badges */}
      {earned.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Earned Badges ({earned.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {earned.map((b) => (
              <Card key={b.slug} className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl mb-1">{b.emoji}</div>
                  <p className="font-medium text-sm">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(b.awardedAt))} ago
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All badges (locked) */}
      <div>
        <h3 className="font-semibold mb-3">All Badges</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ALL_BADGES.filter((b) => !earnedSlugs.has(b.slug)).map((b) => (
            <Card key={b.slug} className="opacity-40 grayscale">
              <CardContent className="pt-4 text-center">
                <div className="text-3xl mb-1">{b.emoji}</div>
                <p className="font-medium text-sm">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.description}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {b.category}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
