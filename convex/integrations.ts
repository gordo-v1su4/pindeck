import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const saveDiscordLink = mutation({
  args: {
    discordUserId: v.string(),
    discordUsername: v.optional(v.string()),
    discordAvatar: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        discordUserId: args.discordUserId,
        discordUsername: args.discordUsername,
        discordAvatar: args.discordAvatar,
      });
      return null;
    }

    await ctx.db.insert("profiles", {
      userId,
      discordUserId: args.discordUserId,
      discordUsername: args.discordUsername,
      discordAvatar: args.discordAvatar,
    });
    return null;
  },
});

export const savePinterestBoard = mutation({
  args: {
    boardUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      const boards = new Set(existing.pinterestBoards ?? []);
      boards.add(args.boardUrl);
      await ctx.db.patch(existing._id, {
        pinterestBoards: Array.from(boards),
      });
      return null;
    }

    await ctx.db.insert("profiles", {
      userId,
      pinterestBoards: [args.boardUrl],
    });
    return null;
  },
});

export const listImportBatches = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("importBatches")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});
