import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    let images;
    
    if (args.category) {
      images = await ctx.db
        .query("images")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .take(args.limit || 50);
    } else {
      images = await ctx.db
        .query("images")
        .order("desc")
        .take(args.limit || 50);
    }

    // Get like status for each image if user is logged in
    const imagesWithLikes = await Promise.all(
      images.map(async (image) => {
        let isLiked = false;
        if (userId) {
          const like = await ctx.db
            .query("likes")
            .withIndex("by_user_and_image", (q) => 
              q.eq("userId", userId).eq("imageId", image._id)
            )
            .unique();
          isLiked = !!like;
        }
        
        return {
          ...image,
          isLiked,
        };
      })
    );

    return imagesWithLikes;
  },
});

export const search = query({
  args: {
    searchTerm: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    let images;
    
    if (args.category) {
      images = await ctx.db
        .query("images")
        .withSearchIndex("search_content", (q) => 
          q.search("title", args.searchTerm).eq("category", args.category!)
        )
        .take(50);
    } else {
      images = await ctx.db
        .query("images")
        .withSearchIndex("search_content", (q) => q.search("title", args.searchTerm))
        .take(50);
    }

    const imagesWithLikes = await Promise.all(
      images.map(async (image) => {
        let isLiked = false;
        if (userId) {
          const like = await ctx.db
            .query("likes")
            .withIndex("by_user_and_image", (q) => 
              q.eq("userId", userId).eq("imageId", image._id)
            )
            .unique();
          isLiked = !!like;
        }
        
        return {
          ...image,
          isLiked,
        };
      })
    );

    return imagesWithLikes;
  },
});

export const getById = query({
  args: { id: v.id("images") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const image = await ctx.db.get(args.id);
    
    if (!image) return null;

    let isLiked = false;
    if (userId) {
      const like = await ctx.db
        .query("likes")
        .withIndex("by_user_and_image", (q) => 
          q.eq("userId", userId).eq("imageId", image._id)
        )
        .unique();
      isLiked = !!like;
    }

    return {
      ...image,
      isLiked,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.string(),
    tags: v.array(v.string()),
    category: v.string(),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to create images");
    }

    return await ctx.db.insert("images", {
      ...args,
      uploadedBy: userId,
      likes: 0,
      views: 0,
    });
  },
});

export const toggleLike = mutation({
  args: { imageId: v.id("images") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to like images");
    }

    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_and_image", (q) => 
        q.eq("userId", userId).eq("imageId", args.imageId)
      )
      .unique();

    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new Error("Image not found");
    }

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      await ctx.db.patch(args.imageId, {
        likes: Math.max(0, image.likes - 1),
      });
      return false;
    } else {
      // Like
      await ctx.db.insert("likes", {
        userId,
        imageId: args.imageId,
      });
      await ctx.db.patch(args.imageId, {
        likes: image.likes + 1,
      });
      return true;
    }
  },
});

export const incrementViews = mutation({
  args: { imageId: v.id("images") },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) return;
    
    await ctx.db.patch(args.imageId, {
      views: image.views + 1,
    });
  },
});

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("images").collect();
    const categories = [...new Set(images.map(img => img.category))];
    return categories.sort();
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to upload images");
    }
    
    return await ctx.storage.generateUploadUrl();
  },
});

export const uploadMultiple = mutation({
  args: {
    uploads: v.array(v.object({
      storageId: v.id("_storage"),
      title: v.string(),
      description: v.optional(v.string()),
      tags: v.array(v.string()),
      category: v.string(),
      source: v.optional(v.string()),
      sref: v.optional(v.string()),
      colors: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to upload images");
    }

    const results = await Promise.all(
      args.uploads.map(async (upload) => {
        // Get the image URL from storage
        const imageUrl = await ctx.storage.getUrl(upload.storageId);
        if (!imageUrl) {
          throw new Error("Failed to get image URL");
        }

        // Create the image record
        return await ctx.db.insert("images", {
          title: upload.title,
          description: upload.description,
          imageUrl,
          storageId: upload.storageId,
          tags: upload.tags,
          category: upload.category,
          source: upload.source,
          sref: upload.sref,
          colors: upload.colors,
          uploadedBy: userId,
          likes: 0,
          views: 0,
        });
      })
    );

    return results;
  },
});