import { z } from "zod";
import type { Scenario, ScenarioParameter } from "./scenarios";

/**
 * Dynamically build a Zod validation schema from a scenario's parameter
 * descriptors.  The resulting schema is used by react-hook-form (zodResolver)
 * in VariableEditorClient and as a server-side guard before POST /api/sim/run.
 */
export function buildParameterSchema(scenario: Scenario): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, rawParam] of Object.entries(scenario.parameters)) {
    const param = rawParam as ScenarioParameter;
    switch (param.type) {
      case "number": {
        let schema = z.number({ message: `${param.label} must be a number` });
        if (param.min !== undefined) schema = schema.min(param.min);
        if (param.max !== undefined) schema = schema.max(param.max);
        shape[key] = schema;
        break;
      }
      case "percentage": {
        shape[key] = z
          .number({ message: `${param.label} must be a decimal between 0 and 1` })
          .min(0)
          .max(1);
        break;
      }
      case "boolean": {
        shape[key] = z.boolean();
        break;
      }
      case "select": {
        if (!param.options || param.options.length === 0) {
          shape[key] = z.string();
        } else {
          const [first, ...rest] = param.options as [string, ...string[]];
          shape[key] = z.enum([first, ...rest]);
        }
        break;
      }
      default: {
        shape[key] = z.unknown();
      }
    }
  }

  return z.object(shape);
}

/**
 * Clamp number and percentage parameter values to their declared min/max
 * without throwing — useful for pre-filling form defaults from stale storage.
 */
export function clampParameters(
  scenario: Scenario,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...values };

  for (const [key, rawParam] of Object.entries(scenario.parameters)) {
    const param = rawParam as ScenarioParameter;
    const raw = result[key];
    if (param.type === "number" || param.type === "percentage") {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) continue;

      const lo = param.type === "percentage" ? 0 : (param.min ?? -Infinity);
      const hi = param.type === "percentage" ? 1 : (param.max ?? Infinity);
      result[key] = Math.min(hi, Math.max(lo, n));
    }
  }

  return result;
}

/**
 * Extract default values from a scenario's parameters, suitable for passing
 * directly to react-hook-form's `defaultValues`.
 */
export function extractDefaultValues(
  scenario: Scenario,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const [key, rawParam] of Object.entries(scenario.parameters)) {
    const param = rawParam as ScenarioParameter;
    defaults[key] = param.default;
  }
  return defaults;
}
