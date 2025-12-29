import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

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
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "active"),
            q.eq(q.field("status"), undefined)
          )
        )
        .order("desc")
        .take(args.limit || 50);
    } else {
      images = await ctx.db
        .query("images")
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "active"),
            q.eq(q.field("status"), undefined)
          )
        )
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
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "active"),
            q.eq(q.field("status"), undefined)
          )
        )
        .take(50);
    } else {
      images = await ctx.db
        .query("images")
        .withSearchIndex("search_content", (q) => q.search("title", args.searchTerm))
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "active"),
            q.eq(q.field("status"), undefined)
          )
        )
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
    const image = await ctx.db.get("images", args.id);
    
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
      uploadedAt: Date.now(),
    });
  },
});

export const internalCreate = internalMutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.string(),
    tags: v.array(v.string()),
    category: v.string(),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
    uploadedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("images", {
      ...args,
      likes: 0,
      views: 0,
      uploadedAt: Date.now(),
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

    const image = await ctx.db.get("images", args.imageId);
    if (!image) {
      throw new Error("Image not found");
    }

    if (existingLike) {
      // Unlike
      await ctx.db.delete("likes", existingLike._id);
      await ctx.db.patch("images", args.imageId, {
        likes: Math.max(0, image.likes - 1),
      });
      return false;
    } else {
      // Like
      await ctx.db.insert("likes", {
        userId,
        imageId: args.imageId,
      });
      await ctx.db.patch("images", args.imageId, {
        likes: image.likes + 1,
      });
      return true;
    }
  },
});

export const incrementViews = mutation({
  args: { imageId: v.id("images") },
  handler: async (ctx, args) => {
    const image = await ctx.db.get("images", args.imageId);
    if (!image) return;
    
    await ctx.db.patch("images", args.imageId, {
      views: image.views + 1,
    });
  },
});

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("images").collect();
    const existingCategories = new Set(images.map(img => img.category));
    
    const defaultCategories = [
      "Abstract", "Architecture", "Art", "Black & White", "Character Design", 
      "Cinematic", "Cyberpunk", "Design", "Fashion", "Film", 
      "Food", "Gaming", "Illustration", "Interior", "Landscape", 
      "Minimalist", "Nature", "Photography", "Portrait", "Sci-Fi", 
      "Street", "Technology", "Texture", "Travel", "UI/UX", "Vintage"
    ];

    const allCategories = new Set([...defaultCategories, ...existingCategories]);
    return [...allCategories].sort();
  },
});

export const internalGenerateUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
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
      group: v.optional(v.string()),
      projectName: v.optional(v.string()),
      moodboardName: v.optional(v.string()),
      uniqueId: v.optional(v.string()),
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
        const imageId = await ctx.db.insert("images", {
          title: upload.title,
          description: upload.description,
          imageUrl,
          storageId: upload.storageId,
          tags: upload.tags,
          category: upload.category,
          source: upload.source,
          sref: upload.sref,
          colors: upload.colors,
          group: upload.group,
          projectName: upload.projectName,
          moodboardName: upload.moodboardName,
          uniqueId: upload.uniqueId,
          uploadedBy: userId,
          likes: 0,
          views: 0,
          aiStatus: "processing",
          status: "draft",
          uploadedAt: Date.now(),
        });

        // Schedule the smart analysis action directly
        try {
          await ctx.scheduler.runAfter(0, internal.vision.internalSmartAnalyzeImage, {
            storageId: upload.storageId,
            imageId: imageId,
            group: upload.group,
            projectName: upload.projectName,
            moodboardName: upload.moodboardName,
            userId: userId,
            title: upload.title,
            description: upload.description,
            tags: upload.tags,
            category: upload.category,
            source: upload.source,
            sref: upload.sref || undefined, // Pass undefined if sref is empty string
          });
        } catch (err) {
          console.error("Failed to schedule smart analysis:", err);
        }

        return imageId;
      })
    );

    return results;
  },
});

export const getDraftImages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) => q.eq(q.field("status"), "draft"))
      .order("desc")
      .collect();
  },
});

export const finalizeUploads = mutation({
  args: { imageIds: v.array(v.id("images")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    for (const id of args.imageIds) {
      const image = await ctx.db.get("images", id);
      if (image && image.uploadedBy === userId) {
        await ctx.db.patch("images", id, { status: "active" });
      }
    }
  },
});

export const getProcessingImages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) => q.eq(q.field("aiStatus"), "processing"))
      .order("desc")
      .collect();
  },
});

export const getPendingImages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .collect();
  },
});

export const approveImage = mutation({
  args: { imageId: v.id("images") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const image = await ctx.db.get("images", args.imageId);
    if (!image) throw new Error("Image not found");

    if (image.uploadedBy !== userId) throw new Error("Not authorized");

    await ctx.db.patch("images", args.imageId, { status: "active" });
  },
});

export const rejectImage = mutation({
  args: { imageId: v.id("images") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const image = await ctx.db.get("images", args.imageId);
    if (!image) throw new Error("Image not found");

    if (image.uploadedBy !== userId) throw new Error("Not authorized");

    if (image.storageId) {
      await ctx.storage.delete(image.storageId);
    }
    await ctx.db.delete("images", args.imageId);
  },
});

export const remove = mutation({
  args: { id: v.id("images") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const image = await ctx.db.get("images", args.id);
    if (!image) {
      throw new Error("Image not found");
    }

    if (image.uploadedBy !== userId) {
      throw new Error("Not authorized to delete this image");
    }

    // Delete the image from storage if it exists
    if (image.storageId) {
      await ctx.storage.delete(image.storageId);
    }

    // Delete the image record
    await ctx.db.delete("images", args.id);

    return { success: true };
  },
});

export const internalUpdateAnalysis = internalMutation({
  args: {
    imageId: v.id("images"),
    title: v.optional(v.string()),
    description: v.string(),
    tags: v.optional(v.array(v.string())),
    colors: v.array(v.string()),
    category: v.optional(v.string()),
    aiStatus: v.optional(v.string()),
    group: v.optional(v.string()),
    projectName: v.optional(v.string()),
    moodboardName: v.optional(v.string()),
    sref: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: any = {
      description: args.description,
      colors: args.colors,
    };
    if (args.title) patch.title = args.title;
    if (args.tags) patch.tags = args.tags;
    if (args.category) patch.category = args.category;
    if (args.aiStatus) patch.aiStatus = args.aiStatus;
    if (args.group !== undefined) patch.group = args.group;
    if (args.projectName !== undefined) patch.projectName = args.projectName;
    if (args.moodboardName !== undefined) patch.moodboardName = args.moodboardName;
    // Preserve sref if provided, otherwise don't overwrite existing value
    if (args.sref !== undefined) patch.sref = args.sref;

    await ctx.db.patch("images", args.imageId, patch);
  },
});

export const internalSetAiStatus = internalMutation({
  args: {
    imageId: v.id("images"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch("images", args.imageId, { aiStatus: args.status });
  },
});

export const updateAnalysis = mutation({
  args: {
    imageId: v.id("images"),
    description: v.string(),
    colors: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const image = await ctx.db.get("images", args.imageId);
    if (!image) {
      throw new Error("Image not found");
    }

    if (image.uploadedBy !== userId) {
      throw new Error("Not authorized to update this image");
    }

    await ctx.runMutation(internal.images.internalUpdateAnalysis, args);

    return { success: true };
  },
});

export const updateImageMetadata = mutation({
  args: {
    imageId: v.id("images"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
    group: v.optional(v.string()),
    projectName: v.optional(v.string()),
    moodboardName: v.optional(v.string()),
    uniqueId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const image = await ctx.db.get("images", args.imageId);
    if (!image) {
      throw new Error("Image not found");
    }
    if (image.uploadedBy !== userId) {
      throw new Error("Not authorized to update this image");
    }

    const patch: any = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.category !== undefined) patch.category = args.category;
    if (args.source !== undefined) patch.source = args.source;
    if (args.sref !== undefined) patch.sref = args.sref;
    if (args.group !== undefined) patch.group = args.group;
    if (args.projectName !== undefined) patch.projectName = args.projectName;
    if (args.moodboardName !== undefined) patch.moodboardName = args.moodboardName;
    if (args.uniqueId !== undefined) patch.uniqueId = args.uniqueId;

    await ctx.db.patch("images", args.imageId, patch);

    return { success: true };
  },
});

export const internalSaveGeneratedImages = internalMutation({
  args: {
    originalImageId: v.id("images"),
    images: v.array(v.object({
      url: v.string(),
      title: v.string(),
      description: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const originalImage = await ctx.db.get("images", args.originalImageId);
    if (!originalImage) return;

    for (const img of args.images) {
      await ctx.db.insert("images", {
        title: originalImage.title, // Inherit parent's exact title so they group together
        description: img.description,
        imageUrl: img.url,
        // Inherit metadata from original (which might have been updated by analysis)
        category: originalImage.category,
        tags: [...originalImage.tags, "generated", "variation"],
        uploadedBy: originalImage.uploadedBy,
        likes: 0,
        views: 0,
        source: "AI Generation",
        // Inherit group, projectName, moodboardName, uniqueId from parent
        group: originalImage.group,
        projectName: originalImage.projectName,
        moodboardName: originalImage.moodboardName,
        uniqueId: originalImage.uniqueId,
        // sref should only be set manually by user, not auto-populated
        status: "pending",
        uploadedAt: Date.now(),
      });
    }

    // Mark original image processing as completed
    await ctx.db.patch("images", args.originalImageId, { aiStatus: "completed" });
  },
});