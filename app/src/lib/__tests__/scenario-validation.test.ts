import { describe, it, expect } from "vitest";
import { buildParameterSchema, clampParameters, extractDefaultValues } from "../scenario-validation";
import { getScenario, ALL_SCENARIOS } from "../scenarios";

describe("buildParameterSchema", () => {
  const seedRound = getScenario("seed-round-sizing")!;

  it("returns a Zod schema with a parse function", () => {
    const schema = buildParameterSchema(seedRound);
    expect(schema).toBeDefined();
    expect(typeof schema.parse).toBe("function");
    expect(typeof schema.safeParse).toBe("function");
  });

  it("validates valid seed-round-sizing parameters", () => {
    const schema = buildParameterSchema(seedRound);
    const params = {
      runway_months: 18,
      burn_rate_monthly: 50000,
      arr_at_raise: 0,
      team_size: 3,
    };
    expect(() => schema.parse(params)).not.toThrow();
  });

  it("rejects team_size below minimum (1)", () => {
    const schema = buildParameterSchema(seedRound);
    const result = schema.safeParse({
      runway_months: 18,
      burn_rate_monthly: 50000,
      arr_at_raise: 0,
      team_size: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects team_size above maximum (20)", () => {
    const schema = buildParameterSchema(seedRound);
    const result = schema.safeParse({
      runway_months: 18,
      burn_rate_monthly: 50000,
      arr_at_raise: 0,
      team_size: 21,
    });
    expect(result.success).toBe(false);
  });

  it("rejects runway_months below minimum (6)", () => {
    const schema = buildParameterSchema(seedRound);
    const result = schema.safeParse({
      runway_months: 5,
      burn_rate_monthly: 50000,
      arr_at_raise: 0,
      team_size: 3,
    });
    expect(result.success).toBe(false);
  });

  it("rejects runway_months above maximum (36)", () => {
    const schema = buildParameterSchema(seedRound);
    const result = schema.safeParse({
      runway_months: 37,
      burn_rate_monthly: 50000,
      arr_at_raise: 0,
      team_size: 3,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required parameter", () => {
    const schema = buildParameterSchema(seedRound);
    const result = schema.safeParse({
      burn_rate_monthly: 50000,
      // runway_months missing
      arr_at_raise: 0,
      team_size: 3,
    });
    expect(result.success).toBe(false);
  });

  it("accepts boundary values at min and max", () => {
    const schema = buildParameterSchema(seedRound);
    // min runway = 6, min team = 1
    expect(() =>
      schema.parse({
        runway_months: 6,
        burn_rate_monthly: 0,
        arr_at_raise: 0,
        team_size: 1,
      })
    ).not.toThrow();
    // max runway = 36, max team = 20
    expect(() =>
      schema.parse({
        runway_months: 36,
        burn_rate_monthly: 1000000,
        arr_at_raise: 5000000,
        team_size: 20,
      })
    ).not.toThrow();
  });

  it("builds a valid schema for vp-hire-timing (includes boolean)", () => {
    const vpHire = getScenario("vp-hire-timing")!;
    const schema = buildParameterSchema(vpHire);
    const params = {
      current_arr: 300000,
      founder_can_sell: true,
      avg_deal_size: 24000,
      sales_cycle_days: 45,
    };
    expect(() => schema.parse(params)).not.toThrow();
  });

  it("rejects non-boolean for boolean parameter", () => {
    const vpHire = getScenario("vp-hire-timing")!;
    const schema = buildParameterSchema(vpHire);
    const result = schema.safeParse({
      current_arr: 300000,
      founder_can_sell: "yes", // should be boolean
      avg_deal_size: 24000,
      sales_cycle_days: 45,
    });
    expect(result.success).toBe(false);
  });

  it("builds a valid schema for all 7 scenarios", () => {
    for (const s of ALL_SCENARIOS) {
      expect(() => buildParameterSchema(s), `Failed for ${s.id}`).not.toThrow();
    }
  });
});

describe("clampParameters", () => {
  const seedRound = getScenario("seed-round-sizing")!;

  it("clamps runway_months to max (36)", () => {
    const clamped = clampParameters(seedRound, {
      runway_months: 100,
      burn_rate_monthly: 50000,
      arr_at_raise: 0,
      team_size: 3,
    });
    expect(clamped.runway_months).toBe(36);
  });

  it("clamps runway_months to min (6)", () => {
    const clamped = clampParameters(seedRound, {
      runway_months: 1,
      burn_rate_monthly: 50000,
      arr_at_raise: 0,
      team_size: 3,
    });
    expect(clamped.runway_months).toBe(6);
  });

  it("clamps team_size to min (1)", () => {
    const clamped = clampParameters(seedRound, {
      runway_months: 18,
      burn_rate_monthly: 50000,
      arr_at_raise: 0,
      team_size: -5,
    });
    expect(clamped.team_size).toBe(1);
  });

  it("clamps team_size to max (20)", () => {
    const clamped = clampParameters(seedRound, {
      runway_months: 18,
      burn_rate_monthly: 50000,
      arr_at_raise: 0,
      team_size: 999,
    });
    expect(clamped.team_size).toBe(20);
  });

  it("leaves valid values unchanged", () => {
    const input = {
      runway_months: 18,
      burn_rate_monthly: 50000,
      arr_at_raise: 0,
      team_size: 3,
    };
    const clamped = clampParameters(seedRound, input);
    expect(clamped.runway_months).toBe(18);
    expect(clamped.team_size).toBe(3);
  });

  it("does not mutate the original object", () => {
    const input = { runway_months: 100, team_size: -1, burn_rate_monthly: 50000, arr_at_raise: 0 };
    clampParameters(seedRound, input);
    expect(input.runway_months).toBe(100);
    expect(input.team_size).toBe(-1);
  });

  it("handles non-numeric values by skipping clamp", () => {
    // Non-finite (NaN) values are skipped
    const clamped = clampParameters(seedRound, { runway_months: NaN, team_size: 3, burn_rate_monthly: 50000, arr_at_raise: 0 });
    expect(clamped.runway_months).toBeNaN();
  });

  it("clamps percentage parameters to 0–1 range", () => {
    // Find a scenario with a percentage param
    const scenarioWithPct = ALL_SCENARIOS.find((s) =>
      Object.values(s.parameters).some((p) => p.type === "percentage")
    );
    if (!scenarioWithPct) return; // Skip if none

    const pctKey = Object.entries(scenarioWithPct.parameters).find(
      ([, p]) => p.type === "percentage"
    )![0];

    const clamped = clampParameters(scenarioWithPct, { [pctKey]: 5.0 });
    expect(clamped[pctKey]).toBe(1);

    const clampedLow = clampParameters(scenarioWithPct, { [pctKey]: -1.0 });
    expect(clampedLow[pctKey]).toBe(0);
  });
});

describe("extractDefaultValues", () => {
  const seedRound = getScenario("seed-round-sizing")!;

  it("returns all parameter defaults", () => {
    const defaults = extractDefaultValues(seedRound);
    expect(defaults.runway_months).toBe(18);
    expect(defaults.burn_rate_monthly).toBe(50000);
    expect(defaults.arr_at_raise).toBe(0);
    expect(defaults.team_size).toBe(3);
  });

  it("returns defaults for vp-hire-timing including boolean", () => {
    const vpHire = getScenario("vp-hire-timing")!;
    const defaults = extractDefaultValues(vpHire);
    expect(defaults.current_arr).toBe(300000);
    expect(defaults.founder_can_sell).toBe(true);
  });

  it("extracted defaults pass schema validation", () => {
    for (const s of ALL_SCENARIOS) {
      const defaults = extractDefaultValues(s);
      const schema = buildParameterSchema(s);
      const result = schema.safeParse(defaults);
      expect(result.success, `Defaults fail validation for ${s.id}`).toBe(true);
    }
  });
});
