import { expect, test } from "@playwright/test";

async function expectLibraryShell(page: import("@playwright/test").Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pd-main-shell")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(".pd-search-shell input")).toBeVisible({ timeout: 30_000 });
}

test.describe("Pindeck app smoke (production Convex)", () => {
  test("owner session loads library chrome", async ({ page }) => {
    await expectLibraryShell(page);
  });

  test("gallery or table view renders without fatal errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await expectLibraryShell(page);

    const hasLibraryChrome =
      (await page.locator(".pd-search-shell input").isVisible()) ||
      (await page.locator(".pd-app-shell img").count()) > 0 ||
      (await page.getByText(/no images|empty|upload/i).count()) > 0;
    expect(hasLibraryChrome).toBeTruthy();
    expect(errors.filter((m) => !m.includes("ResizeObserver"))).toEqual([]);
  });
});
