import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ALL_SCENARIOS, getScenariosForArchetype } from "@/lib/scenarios";
import { ScenarioGrid } from "@/components/scenarios/ScenarioGrid";
import { ActiveSimsRow } from "@/components/hub/ActiveSimsRow";
import { RecommendedBanner } from "@/components/hub/RecommendedBanner";
import { Badge } from "@/components/ui/badge";
import { HubScenarioGridClient } from "@/components/hub/HubScenarioGridClient";
import { QuotaBar } from "@/components/billing/QuotaBar";
import { MONTHLY_SIM_QUOTA, hasTier } from "@/lib/tier";
import type { Tier } from "@/lib/tier";
import { CustomModelsSection } from "@/components/hub/CustomModelsSection";
import StreakWidget from "@/components/hub/StreakWidget";

const ARCHETYPE_LABELS: Record<string, string> = {
  b2b_saas: "B2B SaaS",
  b2c: "B2C / Consumer",
  marketplace: "Marketplace",
  hardware: "Hardware",
  solo: "Solo Founder",
};

export default async function HubPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?from=/hub");
  }

  const t = await getTranslations("fate.hub");

  // Fetch profile for archetype + displayName
  const userTier = ((session.user as { tier?: string }).tier ?? "free") as Tier;

  const profile = await db.profile.findUnique({
    where: { userId: session.user.id },
    select: { archetype: true, displayName: true },
  });

  const archetype = profile?.archetype ?? null;
  const displayName = profile?.displayName ?? session.user.name ?? null;

  // Quota usage: count sims created this calendar month
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const simsThisMonth = await db.simulationRecord.count({
    where: {
      userId: session.user.id,
      createdAt: { gte: startOfMonth },
      status: { not: "cancelled" },
    },
  });
  const simQuota = MONTHLY_SIM_QUOTA[userTier];

  // Fetch recent simulations (active + completed, latest 5)
  const recentSims = await db.simulationRecord.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["queued", "running", "completed"] },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, scenarioId: true, status: true, createdAt: true },
  });

  const simsForRow = recentSims.map((s) => ({
    id: s.id,
    scenarioId: s.scenarioId,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
  }));

  // Recommended scenarios for the user's archetype
  const recommended = archetype ? getScenariosForArchetype(archetype) : [];

  // Custom models (Pro+): only ready models with quality score >= 0.7
  const customModels = hasTier(userTier, "pro")
    ? await db.customModel.findMany({
        where: {
          userId: session.user.id,
          status: "ready",
          qualityScore: { gte: 0.7 },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          qualityScore: true,
          sourceType: true,
          scenarioJson: true,
        },
      })
    : [];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">

        {/* Quota bar — only shown to free-tier users */}
        {simQuota !== -1 && (
          <QuotaBar used={simsThisMonth} total={simQuota} tier={userTier} />
        )}

        {/* Welcome banner */}
        <section className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {displayName ? t("welcome", { name: displayName }) : t("welcomeNew")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a scenario below and run your first consequence simulation.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <StreakWidget />
            {archetype && (
              <Badge
                variant="outline"
                className="border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 px-3 py-1 text-sm"
              >
                {ARCHETYPE_LABELS[archetype] ?? archetype}
              </Badge>
            )}
          </div>
        </section>

        {/* Continue where you left off */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("continueHeading")}</h2>
          <ActiveSimsRow sims={simsForRow} />
        </section>

        {/* Recommended scenarios */}
        {archetype && recommended.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              {t("recommendedHeading")}
            </h2>
            <RecommendedBanner
              archetype={archetype}
              scenarioCount={recommended.length}
            />
            <div className="mt-4">
              <HubScenarioGridClient
                scenarios={recommended}
                userArchetype={archetype}
              />
            </div>
          </section>
        )}

        {/* Enterprise Pre-Mortem CTA */}
        {hasTier(userTier, "enterprise") && (
          <section className="rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-indigo-900 dark:text-indigo-200">
                Enterprise Pre-Mortem
              </h2>
              <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-0.5">
                Upload a business plan (PDF/DOCX) or paste a URL to run a Monte Carlo failure
                analysis across hundreds of scenarios.
              </p>
            </div>
            <Link
              href="/premortem"
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shrink-0"
            >
              Run Pre-Mortem &rarr;
            </Link>
          </section>
        )}

        {/* All scenarios */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("allScenariosHeading")}</h2>
          <HubScenarioGridClient
            scenarios={ALL_SCENARIOS}
            userArchetype={archetype ?? undefined}
          />
        </section>

        {/* Custom domain models (Pro+) */}
        {customModels.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Your Custom Models</h2>
            <CustomModelsSection models={customModels} />
          </section>
        )}
      </div>
    </main>
  );
}
