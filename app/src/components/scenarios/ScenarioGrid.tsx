"use client";

import { ScenarioCard } from "@/components/scenarios/ScenarioCard";
import type { Scenario } from "@/lib/scenarios";

interface ScenarioGridProps {
  scenarios: Scenario[];
  userArchetype?: string;
  onSelect?: (scenario: Scenario) => void;
}

export function ScenarioGrid({
  scenarios,
  userArchetype,
  onSelect,
}: ScenarioGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {scenarios.map((scenario) => (
        <ScenarioCard
          key={scenario.id}
          scenario={scenario}
          userArchetype={userArchetype}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
