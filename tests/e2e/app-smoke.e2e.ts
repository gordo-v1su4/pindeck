import { expect, test } from "@playwright/test";

test.describe("Pindeck app smoke (production Convex)", () => {
  test("guest sign-in loads library chrome", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /continue as guest/i })).toBeVisible();
    await page.getByRole("button", { name: /continue as guest/i }).click();

    await expect(page.getByText(/loading session/i)).toBeHidden({ timeout: 60_000 });

    await expect(page.locator(".site-brand-word, .pd-theme")).toBeVisible({
      timeout: 60_000,
    });

    const search = page.locator('input[type="search"], input[placeholder*="Search" i]').first();
    await expect(search).toBeVisible({ timeout: 60_000 });
  });

  test("gallery or table view renders without fatal errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.getByRole("button", { name: /continue as guest/i }).click();
    await expect(page.getByText(/loading session/i)).toBeHidden({ timeout: 60_000 });

    await page.waitForTimeout(3000);

    const hasTiles =
      (await page.locator("img").count()) > 0 ||
      (await page.getByText(/no images|empty|upload/i).count()) > 0;
    expect(hasTiles).toBeTruthy();
    expect(errors.filter((m) => !m.includes("ResizeObserver"))).toEqual([]);
  });
});
