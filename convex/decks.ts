import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const DECK_TEMPLATE = {
  id: "deck:image-highlight",
  layout: "single-image",
};

export const listByBoard = query({
  args: { boardId: v.id("collections") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to view decks");
    }

    return ctx.db
      .query("decks")
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
      throw new Error("Must be logged in to create decks");
    }

    const board = await ctx.db.get("collections", args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found");
    }

    if (board.imageIds.length === 0) {
      throw new Error("Board has no images to convert");
    }

    const slides = board.imageIds.map((imageId, index) => ({
      imageId,
      layout: DECK_TEMPLATE.layout,
      order: index + 1,
    }));

    const deckId = await ctx.db.insert("decks", {
      boardId: board._id,
      userId,
      title: `${board.name} Deck`,
      templateId: DECK_TEMPLATE.id,
      sourceImageIds: board.imageIds,
      slides,
      createdAt: Date.now(),
    });

    return deckId;
  },
});
