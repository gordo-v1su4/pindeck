import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const STORYBOARD_TEMPLATE = {
  id: "storyboard:grid-3x2",
  layout: "grid-3x2",
};

export const listByBoard = query({
  args: { boardId: v.id("collections") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to view storyboards");
    }

    return ctx.db
      .query("storyboards")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .collect();
  },
});

export const createFromBoard = mutation({
  args: {
    boardId: v.id("collections"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to create storyboards");
    }

    const board = await ctx.db.get("collections", args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found");
    }

    if (board.imageIds.length === 0) {
      throw new Error("Board has no images to convert");
    }

    const panels = board.imageIds.map((imageId, index) => ({
      imageId,
      layout: STORYBOARD_TEMPLATE.layout,
      order: index + 1,
    }));

    const storyboardId = await ctx.db.insert("storyboards", {
      boardId: board._id,
      userId,
      title: `${board.name} Storyboard`,
      templateId: STORYBOARD_TEMPLATE.id,
      sourceImageIds: board.imageIds,
      panels,
      createdAt: Date.now(),
    });

    return storyboardId;
  },
});
