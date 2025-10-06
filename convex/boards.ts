import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to view boards");
    }

    const boards = await ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return boards;
  },
});

export const getById = query({
  args: { id: v.id("collections") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to view board");
    }

    const board = await ctx.db.get(args.id);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found");
    }

    // Get the images for this board
    const images = await Promise.all(
      board.imageIds.map(async (imageId) => {
        const image = await ctx.db.get(imageId);
        if (!image) return null;
        
        // Check if user has liked this image
        let isLiked = false;
        const like = await ctx.db
          .query("likes")
          .withIndex("by_user_and_image", (q) => 
            q.eq("userId", userId).eq("imageId", imageId)
          )
          .unique();
        isLiked = !!like;
        
        return {
          ...image,
          isLiked,
        };
      })
    );

    return {
      ...board,
      images: images.filter(Boolean),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to create boards");
    }

    return await ctx.db.insert("collections", {
      name: args.name,
      description: args.description,
      userId,
      isPublic: args.isPublic ?? false,
      imageIds: [],
    });
  },
});

export const addImage = mutation({
  args: {
    boardId: v.id("collections"),
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to add images to boards");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found");
    }

    // Check if image is already in board
    if (board.imageIds.includes(args.imageId)) {
      throw new Error("Image already in board");
    }

    await ctx.db.patch(args.boardId, {
      imageIds: [...board.imageIds, args.imageId],
    });

    return { success: true };
  },
});

export const removeImage = mutation({
  args: {
    boardId: v.id("collections"),
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to remove images from boards");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found");
    }

    await ctx.db.patch(args.boardId, {
      imageIds: board.imageIds.filter(id => id !== args.imageId),
    });

    return { success: true };
  },
});

export const update = mutation({
  args: {
    boardId: v.id("collections"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to update boards");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found");
    }

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;

    await ctx.db.patch(args.boardId, updates);
    return { success: true };
  },
});

export const deleteBoard = mutation({
  args: {
    boardId: v.id("collections"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to delete boards");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== userId) {
      throw new Error("Board not found");
    }

    await ctx.db.delete(args.boardId);
    return { success: true };
  },
});
