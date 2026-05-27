"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Archetype display metadata — colours and descriptions.
const ARCHETYPE_META: Record<
  string,
  { label: string; colour: string; description: string }
> = {
  b2b_saas: {
    label: "B2B SaaS",
    colour:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    description:
      "Software sold to businesses on a subscription model. Focus on ACV, churn, and enterprise sales cycles.",
  },
  b2c: {
    label: "B2C",
    colour:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    description:
      "Consumer-facing products. Prioritise viral growth, low CAC, and high engagement.",
  },
  marketplace: {
    label: "Marketplace",
    colour:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    description:
      "Two-sided platforms connecting buyers and sellers. The cold-start problem is your first boss.",
  },
  hardware: {
    label: "Hardware",
    colour:
      "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    description:
      "Physical products. Long development cycles, high COGS, and supply-chain risk.",
  },
  solo: {
    label: "Solo Founder",
    colour:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    description:
      "A single founder building without co-founders. Bandwidth is the binding constraint.",
  },
};

interface ArchetypeCompatibilityBadgeProps {
  archetypes: string[];
  userArchetype?: string;
}

export function ArchetypeCompatibilityBadge({
  archetypes,
  userArchetype,
}: ArchetypeCompatibilityBadgeProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {archetypes.map((archetype) => {
        const meta = ARCHETYPE_META[archetype] ?? {
          label: archetype,
          colour: "bg-gray-100 text-gray-700",
          description: archetype,
        };
        const isMatch = userArchetype === archetype;

        return (
          <Tooltip key={archetype}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-shadow",
                  meta.colour,
                  isMatch && "ring-2 ring-offset-1 ring-current font-bold",
                )}
              >
                {meta.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-center">
              {meta.description}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
