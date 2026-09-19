import { chromium, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { signInAsOwner } from "./sign-in";

const authFile = path.join(import.meta.dirname, ".auth", "owner.json");

async function globalSetup(config: FullConfig) {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  const baseURL =
    config.projects[0]?.use?.baseURL ??
    process.env.PLAYWRIGHT_BASE_URL ??
    "https://pindeck.dev";

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await signInAsOwner(page, baseURL);
  await context.storageState({ path: authFile });
  await browser.close();
}

export default globalSetup;
