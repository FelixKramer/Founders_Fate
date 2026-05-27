import { test, expect } from "@playwright/test";

test.describe("Billing pages", () => {
  test("/pricing is accessible without authentication", async ({ page }) => {
    const response = await page.goto("/pricing");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL("/pricing");
  });

  test("/pricing shows Pro tier", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("body")).toContainText("Pro");
  });

  test("/pricing shows $49 or pricing information", async ({ page }) => {
    await page.goto("/pricing");
    const body = await page.textContent("body");
    // Should show some pricing info — either $49 or a price
    expect(body).toMatch(/\$\d+|pricing|plan/i);
  });

  test("/pricing shows free tier info", async ({ page }) => {
    await page.goto("/pricing");
    const body = await page.textContent("body");
    expect(body?.toLowerCase()).toContain("free");
  });

  test("/billing redirects unauthenticated users away", async ({ page }) => {
    await page.goto("/billing");
    await expect(page).not.toHaveURL("/billing");
  });

  test("/billing/upgrade redirects unauthenticated users", async ({ page }) => {
    await page.goto("/billing/upgrade");
    await expect(page).not.toHaveURL("/billing/upgrade");
  });
});

test.describe("Stripe webhook endpoint", () => {
  test("POST /api/webhooks/stripe returns 400 without valid signature (not 200)", async ({
    request,
  }) => {
    const resp = await request.post("/api/webhooks/stripe", {
      data: { type: "customer.subscription.updated" },
      headers: { "content-type": "application/json" },
    });
    // Without valid Stripe-Signature header, should reject
    expect([400, 401, 403]).toContain(resp.status());
    expect(resp.status()).not.toBe(200);
  });
});
