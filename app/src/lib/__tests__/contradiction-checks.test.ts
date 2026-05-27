import { describe, it, expect } from "vitest";
import { checkContradictions } from "../contradiction-checks";

describe("checkContradictions — vp-hire-timing", () => {
  it("warns when hiring VP at <$100k ARR with hire-now-sub-500k option", () => {
    const warnings = checkContradictions("vp-hire-timing", "hire-now-sub-500k", {
      current_arr: 50000,
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].severity).toBe("warning");
    expect(warnings[0].id).toBe("vp_hire_too_early");
    expect(warnings[0].message).toContain("$100k ARR");
  });

  it("warns at exactly $0 ARR (boundary)", () => {
    const warnings = checkContradictions("vp-hire-timing", "hire-now-sub-500k", {
      current_arr: 0,
    });
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("warns at $99,999 ARR (just below threshold)", () => {
    const warnings = checkContradictions("vp-hire-timing", "hire-now-sub-500k", {
      current_arr: 99999,
    });
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("no warning when ARR is exactly $100k (boundary — at threshold, no longer triggers)", () => {
    const warnings = checkContradictions("vp-hire-timing", "hire-now-sub-500k", {
      current_arr: 100000,
    });
    // Rule checks < 100_000 so 100000 should NOT trigger
    expect(warnings).toHaveLength(0);
  });

  it("no warning for hire-at-1m-arr option regardless of low ARR", () => {
    const warnings = checkContradictions("vp-hire-timing", "hire-at-1m-arr", {
      current_arr: 50000,
    });
    expect(warnings).toHaveLength(0);
  });

  it("no warning for hire-at-2m-arr option", () => {
    const warnings = checkContradictions("vp-hire-timing", "hire-at-2m-arr", {
      current_arr: 50000,
    });
    expect(warnings).toHaveLength(0);
  });
});

describe("checkContradictions — seed-round-sizing", () => {
  it("warns when runway < 12 months with raise-500k", () => {
    const warnings = checkContradictions("seed-round-sizing", "raise-500k", {
      runway_months: 8,
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].severity).toBe("warning");
    expect(warnings[0].id).toBe("seed_runway_short");
    expect(warnings[0].message).toContain("18+ months");
  });

  it("warns at runway_months = 0 (extreme)", () => {
    const warnings = checkContradictions("seed-round-sizing", "raise-500k", {
      runway_months: 0,
    });
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("no warning when runway >= 12 months with raise-500k", () => {
    const warnings = checkContradictions("seed-round-sizing", "raise-500k", {
      runway_months: 12,
    });
    expect(warnings).toHaveLength(0);
  });

  it("no warning for raise-1-5m even with short runway", () => {
    const warnings = checkContradictions("seed-round-sizing", "raise-1-5m", {
      runway_months: 8,
    });
    expect(warnings).toHaveLength(0);
  });

  it("no warning for raise-3m with short runway", () => {
    const warnings = checkContradictions("seed-round-sizing", "raise-3m", {
      runway_months: 8,
    });
    expect(warnings).toHaveLength(0);
  });
});

describe("checkContradictions — hiring-plan-ab", () => {
  it("warns on aggressive hire with headcount < 3", () => {
    const warnings = checkContradictions("hiring-plan-ab", "hire-aggressively", {
      current_headcount: 2,
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].id).toBe("aggressive_hire_small_team");
  });

  it("warns at headcount = 1", () => {
    const warnings = checkContradictions("hiring-plan-ab", "hire-aggressively", {
      current_headcount: 1,
    });
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("no warning at headcount = 3 (boundary)", () => {
    const warnings = checkContradictions("hiring-plan-ab", "hire-aggressively", {
      current_headcount: 3,
    });
    expect(warnings).toHaveLength(0);
  });

  it("no warning for non-aggressive option with small team", () => {
    const warnings = checkContradictions("hiring-plan-ab", "hire-conservatively", {
      current_headcount: 1,
    });
    expect(warnings).toHaveLength(0);
  });
});

describe("checkContradictions — bridge-round", () => {
  it("warns on take-bridge with < 2 months runway", () => {
    const warnings = checkContradictions("bridge-round", "take-bridge", {
      months_runway: 1,
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].id).toBe("bridge_low_runway");
    expect(warnings[0].message).toContain("<2 months");
  });

  it("warns at months_runway = 0", () => {
    const warnings = checkContradictions("bridge-round", "take-bridge", {
      months_runway: 0,
    });
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("no warning at months_runway = 2 (boundary)", () => {
    const warnings = checkContradictions("bridge-round", "take-bridge", {
      months_runway: 2,
    });
    expect(warnings).toHaveLength(0);
  });

  it("no warning when not taking bridge", () => {
    const warnings = checkContradictions("bridge-round", "decline-bridge", {
      months_runway: 1,
    });
    expect(warnings).toHaveLength(0);
  });
});

describe("checkContradictions — unrelated scenarios", () => {
  it("pricing-strategy has no contradiction rules", () => {
    const warnings = checkContradictions("pricing-strategy", "kill_freemium", {
      mrr: 10000,
    });
    expect(warnings).toHaveLength(0);
  });

  it("gtm-sensitivity has no contradiction rules", () => {
    const warnings = checkContradictions("gtm-sensitivity", "go_outbound", {
      budget: 50000,
    });
    expect(warnings).toHaveLength(0);
  });

  it("unknown scenario returns empty array", () => {
    const warnings = checkContradictions("nonexistent-scenario", "some-option", {
      value: 42,
    });
    expect(warnings).toHaveLength(0);
  });

  it("returns empty array on empty parameters", () => {
    const warnings = checkContradictions("vp-hire-timing", "hire-now-sub-500k", {});
    // current_arr is NaN (Number(undefined)), which is not < 100_000
    // so no warning should fire
    expect(warnings).toHaveLength(0);
  });
});

describe("checkContradictions — return shape", () => {
  it("each warning has id, message, and severity fields", () => {
    const warnings = checkContradictions("vp-hire-timing", "hire-now-sub-500k", {
      current_arr: 50000,
    });
    for (const w of warnings) {
      expect(typeof w.id).toBe("string");
      expect(w.id.length).toBeGreaterThan(0);
      expect(typeof w.message).toBe("string");
      expect(w.message.length).toBeGreaterThan(0);
      expect(["warning", "info"]).toContain(w.severity);
    }
  });
});
