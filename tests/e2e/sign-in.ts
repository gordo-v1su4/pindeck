import { expect, type Page } from "@playwright/test";

export const E2E_DEFAULT_EMAIL = "gordo@v1su4.com";

export function e2eCredentials(): { email: string; password: string } {
  const strip = (v: string) => {
    const t = v.trim();
    if (
      (t.startsWith('"') && t.endsWith('"')) ||
      (t.startsWith("'") && t.endsWith("'")) ||
      (t.startsWith("`") && t.endsWith("`"))
    ) {
      return t.slice(1, -1);
    }
    return t;
  };
  const email = strip(process.env.E2E_EMAIL ?? E2E_DEFAULT_EMAIL);
  const password = strip(process.env.E2E_PASSWORD?.trim() ?? "");
  if (!password) {
    throw new Error(
      "E2E_PASSWORD is missing. Add E2E_PASSWORD (and optional E2E_EMAIL) to .env for Playwright sign-in.",
    );
  }
  return { email, password };
}

/** Password sign-in against production (or PLAYWRIGHT_BASE_URL). */
export async function signInAsOwner(page: Page, baseURL?: string): Promise<void> {
  const { email, password } = e2eCredentials();
  const origin = (baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "https://pindeck.dev").replace(
    /\/$/,
    "",
  );

  await page.goto(`${origin}/`, { waitUntil: "networkidle" });
  await expect(page.getByLabel("email")).toBeVisible({ timeout: 60_000 });

  await page.getByLabel("email").fill(email);
  await page.getByLabel("password").fill(password);
  await page.locator("form.auth-form-stack button[type='submit']").click();

  await expect(page.locator(".pd-main-shell")).toBeVisible({ timeout: 90_000 });
  await expect(page.locator(".pd-search-shell input")).toBeVisible({ timeout: 30_000 });
}
