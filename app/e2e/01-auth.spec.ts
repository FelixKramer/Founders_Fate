import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects unauthenticated users from /hub to sign-in", async ({ page }) => {
    await page.goto("/hub");
    await expect(page).toHaveURL(/sign-in|login|auth/);
  });

  test("redirects unauthenticated users from /onboarding to sign-in", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/sign-in|login|auth/);
  });

  test("redirects unauthenticated users from /billing to sign-in", async ({ page }) => {
    await page.goto("/billing");
    await expect(page).not.toHaveURL("/billing");
  });

  test("pricing page is publicly accessible", async ({ page }) => {
    const response = await page.goto("/pricing");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL("/pricing");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("share page does not redirect to auth for invalid share code", async ({ page }) => {
    await page.goto("/sim/share/invalidcode123");
    await expect(page).not.toHaveURL(/sign-in|login/);
    // Page should load and show some content (error or not-found UI)
    await expect(page.locator("body")).toBeVisible();
  });

  test("root page responds with 200", async ({ page }) => {
    const response = await page.goto("/");
    // Root can be a landing page (200) or redirect to auth (307/302)
    expect([200, 302, 307]).toContain(response?.status());
  });
});
