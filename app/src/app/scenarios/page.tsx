import { getTranslations } from "next-intl/server";
import { ScenarioGrid } from "@/components/scenarios/ScenarioGrid";
import { ALL_SCENARIOS } from "@/lib/scenarios";

/**
 * /scenarios — public scenario library listing.
 *
 * Server component: ALL_SCENARIOS is imported directly (no fetch)
 * so the list is available at build time and cached statically.
 *
 * revalidate: ISR at 1-hour intervals ensures CDN-cached HTML stays fresh
 * between deploys without requiring a full rebuild.
 */

// ISR: re-render at most once per hour in production.
export const revalidate = 3600;

export default async function ScenariosPage() {
  const t = await getTranslations("fate.scenarios");

  return (
    <main className="container mx-auto px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("heading")}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>
      <ScenarioGrid scenarios={ALL_SCENARIOS} />
    </main>
  );
}
