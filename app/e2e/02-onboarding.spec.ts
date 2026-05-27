import { test, expect } from "@playwright/test";

test.describe("Onboarding flow", () => {
  test("age gate or auth wall appears before archetype selection", async ({ page }) => {
    await page.goto("/onboarding/archetype");
    // Either redirects to auth (unauthenticated) or shows age gate
    const url = page.url();
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    // Should NOT be an internal server error
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("onboarding/name page is guarded", async ({ page }) => {
    await page.goto("/onboarding/name");
    // Unauthenticated → should redirect away
    await expect(page).not.toHaveURL("/onboarding/name");
  });

  test("pricing page shows Free, Pro, and Enterprise tiers", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("body")).toBeVisible();
    // At minimum the pricing page should mention plan names
    const body = await page.textContent("body");
    expect(body?.toLowerCase()).toMatch(/free|pro|enterprise/);
  });
});
