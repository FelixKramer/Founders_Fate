import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

interface RecommendedBannerProps {
  archetype: string;
  scenarioCount: number;
}

const ARCHETYPE_LABELS: Record<string, string> = {
  b2b_saas: "B2B SaaS",
  b2c: "B2C / Consumer",
  marketplace: "Marketplace",
  hardware: "Hardware",
  solo: "Solo Founder",
};

export function RecommendedBanner({
  archetype,
  scenarioCount,
}: RecommendedBannerProps) {
  const t = useTranslations("fate.archetypes");
  const archetypeLabel = ARCHETYPE_LABELS[archetype] ?? t(archetype as Parameters<typeof t>[0]);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">
      <Badge
        variant="outline"
        className="border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 text-xs"
      >
        {archetypeLabel}
      </Badge>
      <span>
        Showing{" "}
        <strong>{scenarioCount}</strong>{" "}
        {scenarioCount === 1 ? "scenario" : "scenarios"} matched to your{" "}
        <strong>{archetypeLabel}</strong> profile
      </span>
    </div>
  );
}
