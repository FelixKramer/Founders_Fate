"use client";

import { useRouter } from "next/navigation";
import { ScenarioGrid } from "@/components/scenarios/ScenarioGrid";
import type { Scenario } from "@/lib/scenarios";

interface HubScenarioGridClientProps {
  scenarios: Scenario[];
  userArchetype?: string;
}

/**
 * Thin client wrapper that wires `onSelect` navigation for ScenarioGrid.
 * ScenarioGrid is already a client component; this component exists so the
 * server-side HubPage doesn't need `"use client"` while still providing the
 * router-based callback.
 */
export function HubScenarioGridClient({
  scenarios,
  userArchetype,
}: HubScenarioGridClientProps) {
  const router = useRouter();

  return (
    <ScenarioGrid
      scenarios={scenarios}
      userArchetype={userArchetype}
      onSelect={(scenario: Scenario) =>
        router.push(`/sim/new/${scenario.id}`)
      }
    />
  );
}
