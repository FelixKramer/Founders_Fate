import { describe, it, expect } from "vitest";
import {
  TIERS,
  isTier,
  planToTier,
  hasTier,
  requireTier,
  TierRequiredError,
  MONTHLY_SIM_QUOTA,
  SPEND_CAPS,
} from "../tier";

describe("TIERS constant", () => {
  it("contains exactly free, pro, enterprise", () => {
    expect(TIERS).toEqual(["free", "pro", "enterprise"]);
  });
});

describe("isTier", () => {
  it("returns true for valid tiers", () => {
    expect(isTier("free")).toBe(true);
    expect(isTier("pro")).toBe(true);
    expect(isTier("enterprise")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isTier("unknown")).toBe(false);
    expect(isTier("")).toBe(false);
    expect(isTier(null)).toBe(false);
    expect(isTier(undefined)).toBe(false);
    expect(isTier(42)).toBe(false);
    expect(isTier({})).toBe(false);
  });
});

describe("planToTier", () => {
  it("maps 'free' to free", () => {
    expect(planToTier("free")).toBe("free");
  });

  it("maps 'pro' to pro", () => {
    expect(planToTier("pro")).toBe("pro");
  });

  it("maps 'enterprise' to enterprise", () => {
    expect(planToTier("enterprise")).toBe("enterprise");
  });

  it("returns free for unknown plan strings", () => {
    expect(planToTier("starter")).toBe("free");
    expect(planToTier("price_abc123")).toBe("free");
    expect(planToTier("unknown_plan")).toBe("free");
  });

  it("returns free for null", () => {
    expect(planToTier(null)).toBe("free");
  });

  it("returns free for undefined", () => {
    expect(planToTier(undefined)).toBe("free");
  });

  it("returns free for empty string", () => {
    expect(planToTier("")).toBe("free");
  });
});

describe("hasTier", () => {
  it("enterprise satisfies all tiers", () => {
    expect(hasTier("enterprise", "free")).toBe(true);
    expect(hasTier("enterprise", "pro")).toBe(true);
    expect(hasTier("enterprise", "enterprise")).toBe(true);
  });

  it("pro satisfies free and pro but not enterprise", () => {
    expect(hasTier("pro", "free")).toBe(true);
    expect(hasTier("pro", "pro")).toBe(true);
    expect(hasTier("pro", "enterprise")).toBe(false);
  });

  it("free only satisfies free", () => {
    expect(hasTier("free", "free")).toBe(true);
    expect(hasTier("free", "pro")).toBe(false);
    expect(hasTier("free", "enterprise")).toBe(false);
  });
});

describe("requireTier", () => {
  it("does not throw when tier is sufficient", () => {
    expect(() => requireTier("pro", "pro")).not.toThrow();
    expect(() => requireTier("enterprise", "pro")).not.toThrow();
    expect(() => requireTier("free", "free")).not.toThrow();
  });

  it("throws TierRequiredError when tier is insufficient", () => {
    expect(() => requireTier("free", "pro")).toThrow(TierRequiredError);
    expect(() => requireTier("pro", "enterprise")).toThrow(TierRequiredError);
    expect(() => requireTier("free", "enterprise")).toThrow(TierRequiredError);
  });

  it("TierRequiredError carries actual and required tier", () => {
    let caught: TierRequiredError | null = null;
    try {
      requireTier("free", "enterprise");
    } catch (e) {
      caught = e as TierRequiredError;
    }
    expect(caught).not.toBeNull();
    expect(caught!.actual).toBe("free");
    expect(caught!.required).toBe("enterprise");
  });
});

describe("MONTHLY_SIM_QUOTA", () => {
  it("free tier gets 3 simulations per month", () => {
    expect(MONTHLY_SIM_QUOTA.free).toBe(3);
  });

  it("pro tier is unlimited (-1)", () => {
    expect(MONTHLY_SIM_QUOTA.pro).toBe(-1);
  });

  it("enterprise tier is unlimited (-1)", () => {
    expect(MONTHLY_SIM_QUOTA.enterprise).toBe(-1);
  });

  it("all tiers are defined", () => {
    for (const tier of TIERS) {
      expect(MONTHLY_SIM_QUOTA[tier]).toBeDefined();
    }
  });
});

describe("SPEND_CAPS", () => {
  it("free tier hard cap is $2", () => {
    expect(SPEND_CAPS.free.hard).toBe(2);
  });

  it("free tier soft cap is $1", () => {
    expect(SPEND_CAPS.free.soft).toBe(1);
  });

  it("pro tier hard cap is $40", () => {
    expect(SPEND_CAPS.pro.hard).toBe(40);
  });

  it("pro tier soft cap is $20", () => {
    expect(SPEND_CAPS.pro.soft).toBe(20);
  });

  it("enterprise tier hard cap is Infinity", () => {
    expect(SPEND_CAPS.enterprise.hard).toBe(Number.POSITIVE_INFINITY);
  });

  it("enterprise tier soft cap is Infinity", () => {
    expect(SPEND_CAPS.enterprise.soft).toBe(Number.POSITIVE_INFINITY);
  });

  it("soft cap is always <= hard cap", () => {
    for (const tier of TIERS) {
      expect(SPEND_CAPS[tier].soft).toBeLessThanOrEqual(SPEND_CAPS[tier].hard);
    }
  });
});
