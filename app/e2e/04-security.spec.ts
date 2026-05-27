import { test, expect } from "@playwright/test";

test.describe("Security headers", () => {
  test("responses include X-Frame-Options: DENY", async ({ request }) => {
    const resp = await request.get("/");
    const header = resp.headers()["x-frame-options"];
    expect(header).toBe("DENY");
  });

  test("responses include X-Content-Type-Options: nosniff", async ({ request }) => {
    const resp = await request.get("/");
    expect(resp.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("pricing page also has security headers", async ({ request }) => {
    const resp = await request.get("/pricing");
    const headers = resp.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
  });
});

test.describe("IDOR protection", () => {
  test("/api/sim/[id]/results with no auth returns 401 or 404, not 200", async ({ request }) => {
    const resp = await request.get("/api/sim/fake-sim-id-12345/results");
    expect([401, 403, 404, 307]).toContain(resp.status());
    // Must NOT return 200 — that would be an IDOR
    expect(resp.status()).not.toBe(200);
  });

  test("/api/sim/[id] with no auth returns 401 or 404, not 200", async ({ request }) => {
    const resp = await request.get("/api/sim/00000000-0000-0000-0000-000000000001");
    expect([401, 403, 404, 307]).toContain(resp.status());
    expect(resp.status()).not.toBe(200);
  });

  test("POST /api/sim/run with no auth returns 401, not 200", async ({ request }) => {
    const resp = await request.post("/api/sim/run", {
      data: {
        scenario_id: "seed-round-sizing",
        decision_option_id: "raise-1-5m",
        parameters: { runway_months: 18, burn_rate_monthly: 50000, arr_at_raise: 0, team_size: 3 },
      },
    });
    expect([401, 403, 307]).toContain(resp.status());
    expect(resp.status()).not.toBe(201);
  });
});

test.describe("Share endpoint", () => {
  test("GET /api/sim/share/[code] with invalid code returns 404 or 200, not server error", async ({
    request,
  }) => {
    const resp = await request.get("/api/sim/share/testcode123invaliddoesnotexist");
    // 404 = not found (correct), 200 = publicly accessible (correct), 429 = rate limited (correct)
    // 500 = bug
    expect([200, 404, 429]).toContain(resp.status());
    expect(resp.status()).not.toBe(500);
  });
});

test.describe("Admin routes protection", () => {
  test("/admin/users is guarded (auth required)", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).not.toHaveURL("/admin/users");
  });

  test("/admin/flags is guarded", async ({ page }) => {
    await page.goto("/admin/flags");
    await expect(page).not.toHaveURL("/admin/flags");
  });

  test("/admin/audit is guarded", async ({ page }) => {
    await page.goto("/admin/audit");
    await expect(page).not.toHaveURL("/admin/audit");
  });
});
