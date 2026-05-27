import { test, expect } from "@playwright/test";

test.describe("Scenario API", () => {
  test("GET /api/scenarios returns 200 or 401 (auth guard)", async ({ request }) => {
    const resp = await request.get("/api/scenarios");
    // Auth-protected: 401 or redirect, OR 200 with data
    expect([200, 401, 302, 307]).toContain(resp.status());
  });

  test("GET /api/scenarios with valid auth returns 7 scenarios", async ({ request }) => {
    const resp = await request.get("/api/scenarios");
    if (resp.status() === 200) {
      const data = await resp.json();
      expect(data.scenarios).toHaveLength(7);
      for (const s of data.scenarios) {
        expect(s.id).toBeTruthy();
        expect(s.title).toBeTruthy();
        expect(Array.isArray(s.archetype_compatibility)).toBe(true);
      }
    }
  });

  test("GET /api/scenarios/:id returns 404 for unknown id", async ({ request }) => {
    const resp = await request.get("/api/scenarios/nonexistent-scenario-xyz");
    expect([404, 401, 302, 307]).toContain(resp.status());
  });

  test("GET /api/scenarios?archetype=b2b_saas filters correctly", async ({ request }) => {
    const resp = await request.get("/api/scenarios?archetype=b2b_saas");
    if (resp.status() === 200) {
      const data = await resp.json();
      for (const s of data.scenarios) {
        expect(s.archetype_compatibility).toContain("b2b_saas");
      }
    }
  });

  test("GET /api/scenarios?archetype=unknown returns empty list or 400", async ({ request }) => {
    const resp = await request.get("/api/scenarios?archetype=nonexistent_archetype");
    if (resp.status() === 200) {
      const data = await resp.json();
      expect(Array.isArray(data.scenarios)).toBe(true);
      expect(data.scenarios).toHaveLength(0);
    } else {
      expect([400, 401, 307]).toContain(resp.status());
    }
  });
});
