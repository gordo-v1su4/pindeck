import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF || "proj_znbdggczxwkeviflncnx",
  runtime: "node",
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
