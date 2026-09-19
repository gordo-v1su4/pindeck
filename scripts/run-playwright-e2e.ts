#!/usr/bin/env bun
/**
 * Load selected keys from .env into process.env without shell-evaluating the file.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const prefixes = ["E2E_", "PLAYWRIGHT_"];

function loadEnvFile(path: string) {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\r$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!prefixes.some((p) => key.startsWith(p))) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith("`") && value.endsWith("`"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(".env");

const result = spawnSync("bunx", ["playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
