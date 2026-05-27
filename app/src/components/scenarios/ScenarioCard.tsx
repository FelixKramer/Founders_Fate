"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArchetypeCompatibilityBadge } from "@/components/scenarios/ArchetypeCompatibilityBadge";
import type { Scenario } from "@/lib/scenarios";
import { cn } from "@/lib/utils";

// Difficulty badge colours.
const DIFFICULTY_STYLE: Record<
  Scenario["difficulty"],
  { label: string; className: string }
> = {
  beginner: {
    label: "Beginner",
    className:
      "border-transparent bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  intermediate: {
    label: "Intermediate",
    className:
      "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  advanced: {
    label: "Advanced",
    className:
      "border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
};

interface ScenarioCardProps {
  scenario: Scenario;
  userArchetype?: string;
  onSelect?: (scenario: Scenario) => void;
}

export function ScenarioCard({
  scenario,
  userArchetype,
  onSelect,
}: ScenarioCardProps) {
  const difficultyMeta = DIFFICULTY_STYLE[scenario.difficulty];
  const isCompatible =
    !userArchetype ||
    scenario.archetype_compatibility.includes(userArchetype as Scenario["archetype_compatibility"][number]);

  return (
    <Card
      className={cn(
        "relative flex flex-col h-full transition-opacity",
        !isCompatible && "opacity-60",
      )}
    >
      {/* Incompatible overlay */}
      {!isCompatible && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[1px]">
          <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Not compatible with your archetype
          </span>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">
            {scenario.title}
          </CardTitle>
          <Badge className={cn("shrink-0 text-xs", difficultyMeta.className)}>
            {difficultyMeta.label}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {scenario.estimated_minutes} min
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3">
        <CardDescription className="line-clamp-2 text-sm">
          {scenario.description}
        </CardDescription>

        <ArchetypeCompatibilityBadge
          archetypes={scenario.archetype_compatibility}
          userArchetype={userArchetype}
        />

        {/* Tags */}
        {scenario.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {scenario.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          className="w-full"
          onClick={() => onSelect?.(scenario)}
          disabled={!isCompatible}
          aria-label={`Start simulation: ${scenario.title}`}
        >
          Start Simulation
        </Button>
      </CardFooter>
    </Card>
  );
}
