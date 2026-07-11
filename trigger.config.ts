import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF || "proj_znbdggczxwkeviflncnx",
  runtime: "bun",
  // Bun 1.3.3's managed worker commits roughly 1 GiB before task code runs.
  // The 0.5 GiB default small-1x runner produced repeatable SIGILL crashes.
  machine: "medium-1x",
  logLevel: "log",
  maxDuration: 600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 15_000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
});
