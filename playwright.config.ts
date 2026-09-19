import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://pindeck.dev";
const authFile = path.join(import.meta.dirname, "tests/e2e/.auth/owner.json");

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.e2e.ts",
  globalSetup: process.env.E2E_SKIP_GLOBAL_SETUP
    ? undefined
    : "./tests/e2e/global-setup.ts",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    ...(process.env.E2E_SKIP_GLOBAL_SETUP
      ? {}
      : { storageState: authFile }),
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
