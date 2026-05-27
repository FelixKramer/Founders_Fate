"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { SimulationStatusBadge } from "@/components/sim/SimulationStatusBadge";
import { ALL_SCENARIOS } from "@/lib/scenarios";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimSummary {
  id: string;
  scenarioId: string;
  status: string;
  createdAt: string;
}

interface ActiveSimsRowProps {
  sims: SimSummary[];
}

export function ActiveSimsRow({ sims }: ActiveSimsRowProps) {
  const t = useTranslations("fate.hub");
  const router = useRouter();

  if (sims.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("noActiveSims")}</p>
    );
  }

  function handleClick(sim: SimSummary) {
    if (sim.status === "completed") {
      router.push(`/sim/${sim.id}/results`);
    } else {
      router.push(`/sim/${sim.id}`);
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
      {sims.map((sim) => {
        const scenario = ALL_SCENARIOS.find((s) => s.id === sim.scenarioId);
        const scenarioTitle = scenario?.title ?? sim.scenarioId;
        const timeAgo = formatDistanceToNow(new Date(sim.createdAt), {
          addSuffix: true,
        });

        return (
          <button
            key={sim.id}
            onClick={() => handleClick(sim)}
            className={cn(
              "shrink-0 w-56 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl",
            )}
            aria-label={`Open ${scenarioTitle} simulation`}
          >
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-2 p-4">
                <p className="text-sm font-medium leading-snug line-clamp-2">
                  {scenarioTitle}
                </p>
                <SimulationStatusBadge status={sim.status} />
                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="text-xs text-muted-foreground">
                    {timeAgo}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
