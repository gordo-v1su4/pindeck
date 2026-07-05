import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const STORYBOARD_TEMPLATE = {
  id: "storyboard:grid-3x2",
  layout: "grid-3x2",
};

const BOARD_LAYOUT_TEMPLATE = {
  id: "storyboard:board-layout-v1",
};

const boardLayoutFrameValidator = v.object({
  id: v.string(),
  style: v.union(v.literal("grid"), v.literal("hero"), v.literal("strip")),
  gridSize: v.union(v.literal(2), v.literal(3), v.literal(4), v.literal(5)),
  collapsed: v.boolean(),
  note: v.string(),
  slots: v.array(v.union(v.id("images"), v.null())),
});

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

export const saveBoardLayout = mutation({
  args: {
    boardId: v.id("collections"),
    title: v.optional(v.string()),
    frames: v.array(boardLayoutFrameValidator),
  },
  returns: v.id("storyboards"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to save storyboards");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found");
    }

    const boardImageIds = new Set(board.imageIds.map((imageId) => imageId.toString()));
    const frames = args.frames.map((frame) => ({
      ...frame,
      note: frame.note.slice(0, 2000),
      slots: frame.slots.map((imageId) => {
        if (!imageId) return null;
        return boardImageIds.has(imageId.toString()) ? imageId : null;
      }),
    }));

    const sourceImageIds: Array<typeof board.imageIds[number]> = [];
    const panels: Array<{ imageId: typeof board.imageIds[number]; layout: string; order: number }> = [];
    frames.forEach((frame) => {
      frame.slots.forEach((imageId) => {
        if (!imageId) return;
        if (!sourceImageIds.some((existing) => existing === imageId)) {
          sourceImageIds.push(imageId);
          panels.push({
            imageId,
            layout: `${frame.style}-${frame.gridSize}x${frame.gridSize}`,
            order: panels.length + 1,
          });
        }
      });
    });

    const now = Date.now();
    const title = args.title?.trim() || `${board.name} Storyboard`;
    const existing = await ctx.db
      .query("storyboards")
      .withIndex("by_board", (q) => q.eq("boardId", board._id))
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title,
        templateId: BOARD_LAYOUT_TEMPLATE.id,
        sourceImageIds,
        panels,
        layoutState: {
          version: 1,
          frames,
        },
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("storyboards", {
      boardId: board._id,
      userId,
      title,
      templateId: BOARD_LAYOUT_TEMPLATE.id,
      sourceImageIds,
      panels,
      layoutState: {
        version: 1,
        frames,
      },
      createdAt: now,
      updatedAt: now,
    });
  },
});
