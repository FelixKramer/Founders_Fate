import { describe, it, expect } from "vitest";
import {
  ALL_SCENARIOS,
  getScenario,
  getScenariosForArchetype,
  validateScenario,
  ArchetypeSchema,
} from "../scenarios";

describe("ALL_SCENARIOS", () => {
  it("loads exactly 7 scenarios", () => {
    expect(ALL_SCENARIOS).toHaveLength(7);
  });

  it("all scenarios have required fields", () => {
    for (const s of ALL_SCENARIOS) {
      expect(s.id, `scenario.id missing`).toBeTruthy();
      expect(s.title, `${s.id}: title missing`).toBeTruthy();
      expect(s.description, `${s.id}: description missing`).toBeTruthy();
      expect(
        ["beginner", "intermediate", "advanced"],
        `${s.id}: invalid difficulty`
      ).toContain(s.difficulty);
      expect(s.estimated_minutes, `${s.id}: estimated_minutes`).toBeGreaterThan(0);
      expect(
        Array.isArray(s.archetype_compatibility),
        `${s.id}: archetype_compatibility not array`
      ).toBe(true);
      expect(
        s.archetype_compatibility.length,
        `${s.id}: archetype_compatibility empty`
      ).toBeGreaterThan(0);
      expect(typeof s.parameters, `${s.id}: parameters not object`).toBe("object");
      expect(
        Array.isArray(s.decision.options),
        `${s.id}: decision.options not array`
      ).toBe(true);
      expect(
        s.decision.options.length,
        `${s.id}: decision.options empty`
      ).toBeGreaterThan(0);
      expect(s.decision.prompt, `${s.id}: decision.prompt missing`).toBeTruthy();
      expect(Array.isArray(s.tags), `${s.id}: tags not array`).toBe(true);
    }
  });

  it("all scenario IDs are unique", () => {
    const ids = ALL_SCENARIOS.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ALL_SCENARIOS.length);
  });

  it("all decision option IDs are unique within each scenario", () => {
    for (const s of ALL_SCENARIOS) {
      const optionIds = s.decision.options.map((o) => o.id);
      const unique = new Set(optionIds);
      expect(unique.size, `${s.id}: duplicate decision option IDs`).toBe(optionIds.length);
    }
  });

  it("all archetype_compatibility values are valid archetypes", () => {
    const validArchetypes = ArchetypeSchema.options;
    for (const s of ALL_SCENARIOS) {
      for (const arch of s.archetype_compatibility) {
        expect(
          validArchetypes,
          `${s.id}: invalid archetype ${arch}`
        ).toContain(arch);
      }
    }
  });

  it("all parameters have required descriptor fields", () => {
    for (const s of ALL_SCENARIOS) {
      for (const [key, param] of Object.entries(s.parameters)) {
        expect(param.label, `${s.id}.${key}: label missing`).toBeTruthy();
        expect(param.description, `${s.id}.${key}: description missing`).toBeTruthy();
        expect(
          ["number", "percentage", "boolean", "select"],
          `${s.id}.${key}: invalid type`
        ).toContain(param.type);
        expect(param.default, `${s.id}.${key}: default missing`).toBeDefined();
      }
    }
  });

  it("contains expected scenario IDs", () => {
    const ids = ALL_SCENARIOS.map((s) => s.id);
    expect(ids).toContain("seed-round-sizing");
    expect(ids).toContain("hiring-plan-ab");
    expect(ids).toContain("pivot-timing");
    expect(ids).toContain("gtm-sensitivity");
    expect(ids).toContain("bridge-round");
    expect(ids).toContain("vp-hire-timing");
    expect(ids).toContain("pricing-strategy");
  });
});

describe("getScenario", () => {
  it("returns the correct scenario by ID", () => {
    const s = getScenario("seed-round-sizing");
    expect(s).toBeDefined();
    expect(s?.id).toBe("seed-round-sizing");
    expect(s?.title).toContain("Seed");
  });

  it("returns undefined for unknown ID", () => {
    expect(getScenario("nonexistent-scenario")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(getScenario("")).toBeUndefined();
  });

  it("can retrieve every scenario by its own ID", () => {
    for (const s of ALL_SCENARIOS) {
      expect(getScenario(s.id)).toEqual(s);
    }
  });
});

describe("getScenariosForArchetype", () => {
  it("b2b_saas returns scenarios that include b2b_saas", () => {
    const results = getScenariosForArchetype("b2b_saas");
    expect(results.length).toBeGreaterThan(0);
    for (const s of results) {
      expect(s.archetype_compatibility).toContain("b2b_saas");
    }
  });

  it("includes vp-hire-timing for b2b_saas (only archetype)", () => {
    const results = getScenariosForArchetype("b2b_saas");
    const ids = results.map((s) => s.id);
    expect(ids).toContain("vp-hire-timing");
  });

  it("hardware archetype returns fewer or equal scenarios than b2b_saas", () => {
    const b2b = getScenariosForArchetype("b2b_saas");
    const hardware = getScenariosForArchetype("hardware");
    expect(b2b.length).toBeGreaterThanOrEqual(hardware.length);
  });

  it("returns empty array for unknown archetype", () => {
    const results = getScenariosForArchetype("unknown_archetype");
    expect(results).toHaveLength(0);
  });

  it("seed-round-sizing appears for b2b_saas, b2c, and marketplace", () => {
    for (const arch of ["b2b_saas", "b2c", "marketplace"]) {
      const results = getScenariosForArchetype(arch);
      const ids = results.map((s) => s.id);
      expect(ids, `seed-round-sizing should appear for ${arch}`).toContain("seed-round-sizing");
    }
  });
});

describe("validateScenario", () => {
  it("throws on data missing required fields", () => {
    expect(() => validateScenario({ id: "bad" })).toThrow();
    expect(() => validateScenario({})).toThrow();
    expect(() => validateScenario(null)).toThrow();
    expect(() => validateScenario("string")).toThrow();
  });

  it("passes on all valid scenarios", () => {
    for (const s of ALL_SCENARIOS) {
      expect(() => validateScenario(s)).not.toThrow();
    }
  });

  it("throws on invalid difficulty value", () => {
    const base = { ...ALL_SCENARIOS[0] };
    expect(() => validateScenario({ ...base, difficulty: "expert" })).toThrow();
  });

  it("throws on empty decision options", () => {
    const base = { ...ALL_SCENARIOS[0] };
    expect(() =>
      validateScenario({ ...base, decision: { prompt: "x", options: [] } })
    ).toThrow();
  });
});
