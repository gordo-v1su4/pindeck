import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { workspacePreferences } from "./lib/workspacePreferences";

/** Current user's UI preferences, or null when signed out / never saved. */
export const get = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      userId: v.id("users"),
      docsPage: v.optional(v.string()),
      workspace: v.optional(workspacePreferences),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return { userId, docsPage: row?.docsPage, workspace: row?.workspace };
  },
});

/** Save layout only for the authenticated account, including anonymous guests. */
export const setWorkspace = mutation({
  args: { workspace: workspacePreferences },
  returns: v.null(),
  handler: async (ctx, { workspace }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const fields = { workspace, updatedAt: Date.now() };
    if (row) await ctx.db.patch(row._id, fields);
    else await ctx.db.insert("userPreferences", { userId, ...fields });
    return null;
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
      if (row.docsPage !== page)
        await ctx.db.patch(row._id, { docsPage: page, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        docsPage: page,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});
