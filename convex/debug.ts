import { internalAction } from "./_generated/server";

export const checkEnv = internalAction({
  args: {},
  handler: async () => {
    console.log("GOOGLE_API_KEY exists:", !!process.env.GOOGLE_API_KEY);
    console.log("OPEN_ROUTER_KEY exists:", !!process.env.OPEN_ROUTER_KEY);
    if (process.env.GOOGLE_API_KEY) {
        console.log("GOOGLE_API_KEY length:", process.env.GOOGLE_API_KEY.length);
        console.log("GOOGLE_API_KEY start:", process.env.GOOGLE_API_KEY.substring(0, 5));
    }
  },
});
