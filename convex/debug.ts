import { internalAction } from "./_generated/server";

export const checkEnv = internalAction({
  args: {},
  handler: async () => {
    const hasGoogleKey = !!process.env.GOOGLE_API_KEY;
    const hasOpenRouterKey = !!process.env.OPEN_ROUTER_KEY;
    console.log("GOOGLE_API_KEY configured:", hasGoogleKey);
    console.log("OPEN_ROUTER_KEY configured:", hasOpenRouterKey);
  },
});
