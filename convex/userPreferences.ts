import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Current user's UI preferences, or null when signed out / never saved. */
export const get = query({
  args: {},
  returns: v.union(v.null(), v.object({ docsPage: v.optional(v.string()) })),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return row ? { docsPage: row.docsPage } : null;
  },
});

/** Save the last opened Docs page for the current user. */
export const setDocsPage = mutation({
  args: { docsPage: v.string() },
  returns: v.null(),
  handler: async (ctx, { docsPage }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const page = docsPage.slice(0, 64);
    const row = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (row) {
      if (row.docsPage !== page) await ctx.db.patch(row._id, { docsPage: page, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("userPreferences", { userId, docsPage: page, updatedAt: Date.now() });
    }
    return null;
  },
});
