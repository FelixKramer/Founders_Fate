import { describe, it, expect } from "vitest";

describe("cookie-consent (node environment — no document)", () => {
  it("getCookieConsent returns null when document is unavailable", async () => {
    const { getCookieConsent } = await import("../cookie-consent");
    // In node environment, typeof document === 'undefined', so it returns null
    expect(getCookieConsent()).toBeNull();
  });

  it("hasConsented returns false when no consent cookie is set", async () => {
    const { hasConsented } = await import("../cookie-consent");
    expect(hasConsented()).toBe(false);
  });

  it("hasDeclined returns false when no consent cookie is set", async () => {
    const { hasDeclined } = await import("../cookie-consent");
    expect(hasDeclined()).toBe(false);
  });

  it("setConsentCookie is a no-op in node environment", async () => {
    const { setConsentCookie } = await import("../cookie-consent");
    // Should not throw in node env
    expect(() => setConsentCookie("all")).not.toThrow();
    expect(() => setConsentCookie("essential")).not.toThrow();
  });

  it("exports ConsentValue type values: all and essential", () => {
    // Type guard: the two valid string values should flow through getCookieConsent return type
    // We just verify the module shape here since types aren't runtime
    const mod = require("../cookie-consent");
    expect(typeof mod.getCookieConsent).toBe("function");
    expect(typeof mod.hasConsented).toBe("function");
    expect(typeof mod.hasDeclined).toBe("function");
    expect(typeof mod.setConsentCookie).toBe("function");
  });
});
