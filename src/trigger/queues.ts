import { queue } from "@trigger.dev/sdk/v3";

export const pindeckAnalysisQueue = queue({
  name: "pindeck-analysis",
  concurrencyLimit: 2,
});

export const pindeckMediaQueue = queue({
  name: "pindeck-media",
  concurrencyLimit: 2,
});

export const pindeckGenerationQueue = queue({
  name: "pindeck-generation",
  concurrencyLimit: 1,
});
