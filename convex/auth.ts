import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query } from "./_generated/server";
import { v } from "convex/values";

// Use a custom environment variable for the frontend URL since CONVEX_SITE_URL is read-only
// Set FRONTEND_URL in Convex Dashboard → Settings → Environment Variables
const frontendUrl = process.env.FRONTEND_URL || process.env.CONVEX_SITE_URL;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
  domain: frontendUrl ? new URL(frontendUrl).origin : undefined,
});

export const loggedInUser = query({
  args: {},
  returns: v.union(v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
  }), v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get("users", userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
