/**
 * Scenario library — schema, static data, and lookup helpers.
 *
 * All 12 scenario JSON files are imported statically so they are
 * bundled at build time and available in both server and edge runtimes
 * without any dynamic I/O.
 */

import { z } from "zod";

// ---- Archetype enum (mirrors Prisma) ----

export const ArchetypeSchema = z.enum([
  "b2b_saas",
  "b2c",
  "marketplace",
  "hardware",
  "solo",
]);
export type Archetype = z.infer<typeof ArchetypeSchema>;

// ---- Parameter descriptor ----

export const ParameterSchema = z.object({
  label: z.string(),
  type: z.enum(["number", "percentage", "boolean", "select"]),
  default: z.unknown(),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(z.string()).optional(),
  description: z.string(),
});

export type ScenarioParameter = z.infer<typeof ParameterSchema>;

// ---- Decision option ----

const DecisionOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
});

// ---- Full scenario ----

export const ScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  archetype_compatibility: z.array(ArchetypeSchema),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  estimated_minutes: z.number().int().positive(),
  decision: z.object({
    prompt: z.string(),
    options: z.array(DecisionOptionSchema).min(1),
  }),
  parameters: z.record(z.string(), ParameterSchema),
  tags: z.array(z.string()),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

// ---- Validation helper ----

export function validateScenario(data: unknown): Scenario {
  return ScenarioSchema.parse(data);
}

// ---- Static imports — bundled at build time ----

import seedRoundSizingRaw from "@/data/scenarios/seed-round-sizing.json";
import hiringPlanAbRaw from "@/data/scenarios/hiring-plan-ab.json";
import pivotTimingRaw from "@/data/scenarios/pivot-timing.json";
import gtmSensitivityRaw from "@/data/scenarios/gtm-sensitivity.json";
import bridgeRoundRaw from "@/data/scenarios/bridge-round.json";
import vpHireTimingRaw from "@/data/scenarios/vp-hire-timing.json";
import pricingStrategyRaw from "@/data/scenarios/pricing-strategy.json";
import b2cMobileAppLaunchRaw from "@/data/scenarios/b2c-mobile-app-launch.json";
import hardwareStartupFundraisingRaw from "@/data/scenarios/hardware-startup-fundraising.json";
import soloFounderProductizationRaw from "@/data/scenarios/solo-founder-productization.json";
import postSeriesAStrategicPivotRaw from "@/data/scenarios/post-series-a-strategic-pivot.json";
import internationalExpansionRaw from "@/data/scenarios/international-expansion.json";

// Validate each scenario at module load time — fails loudly during build
// if any JSON drifts out of sync with the schema.
export const ALL_SCENARIOS: Scenario[] = [
  seedRoundSizingRaw,
  hiringPlanAbRaw,
  pivotTimingRaw,
  gtmSensitivityRaw,
  bridgeRoundRaw,
  vpHireTimingRaw,
  pricingStrategyRaw,
  b2cMobileAppLaunchRaw,
  hardwareStartupFundraisingRaw,
  soloFounderProductizationRaw,
  postSeriesAStrategicPivotRaw,
  internationalExpansionRaw,
].map((raw) => validateScenario(raw));

// ---- Lookup helpers ----

export function getScenario(id: string): Scenario | undefined {
  return ALL_SCENARIOS.find((s) => s.id === id);
}

export function getScenariosForArchetype(archetype: string): Scenario[] {
  return ALL_SCENARIOS.filter((s) =>
    s.archetype_compatibility.includes(archetype as Archetype),
  );
}
