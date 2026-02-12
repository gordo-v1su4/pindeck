import { v } from "convex/values";
import { httpAction, query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
const internalApi = internal as any;

const MAX_DISCORD_LINEAGE_DEPTH = 12;

function readBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
}

function parseUserIdFromBody(body: any) {
  return typeof body?.userId === "string" && body.userId.trim()
    ? body.userId.trim()
    : undefined;
}

async function resolveLineageRoot(ctx: any, image: any) {
  let current = image;
  let depth = 0;

  while (current?.parentImageId && depth < MAX_DISCORD_LINEAGE_DEPTH) {
    const parent = await ctx.db.get(current.parentImageId);
    if (!parent) break;
    current = parent;
    depth += 1;
  }

  return current || image;
}

async function isDiscordLineage(ctx: any, image: any) {
  let current = image;
  let depth = 0;

  while (current && depth < MAX_DISCORD_LINEAGE_DEPTH) {
    if (current.sourceType === "discord") return true;
    if (!current.parentImageId) return false;
    current = await ctx.db.get(current.parentImageId);
    depth += 1;
  }

  return false;
}

export const list = query({
  args: {
    category: v.optional(v.string()),
    group: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    let images;
    const statusFilter = (q: any) =>
      q.or(
        q.eq(q.field("status"), "active"),
        q.eq(q.field("status"), undefined)
      );

    if (args.group && args.category) {
      images = await ctx.db
        .query("images")
        .withIndex("by_group", (q) => q.eq("group", args.group!))
        .filter((q) =>
          q.and(
            statusFilter(q),
            q.eq(q.field("category"), args.category!)
          )
        )
        .order("desc")
        .take(args.limit || 50);
    } else if (args.group) {
      images = await ctx.db
        .query("images")
        .withIndex("by_group", (q) => q.eq("group", args.group!))
        .filter(statusFilter)
        .order("desc")
        .take(args.limit || 50);
    } else if (args.category) {
      images = await ctx.db
        .query("images")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .filter(statusFilter)
        .order("desc")
        .take(args.limit || 50);
    } else {
      images = await ctx.db
        .query("images")
        .filter(statusFilter)
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
    group: v.optional(v.string()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const statusFilter = (q: any) =>
      q.or(
        q.eq(q.field("status"), "active"),
        q.eq(q.field("status"), undefined)
      );
    
    let images;
    if (args.category && args.group) {
      images = await ctx.db
        .query("images")
        .withSearchIndex("search_content", (q) =>
          q.search("title", args.searchTerm).eq("category", args.category!).eq("group", args.group!)
        )
        .filter(statusFilter)
        .take(50);
    } else if (args.category) {
      images = await ctx.db
        .query("images")
        .withSearchIndex("search_content", (q) =>
          q.search("title", args.searchTerm).eq("category", args.category!)
        )
        .filter(statusFilter)
        .take(50);
    } else if (args.group) {
      images = await ctx.db
        .query("images")
        .withSearchIndex("search_content", (q) =>
          q.search("title", args.searchTerm).eq("group", args.group!)
        )
        .filter(statusFilter)
        .take(50);
    } else {
      images = await ctx.db
        .query("images")
        .withSearchIndex("search_content", (q) => q.search("title", args.searchTerm))
        .filter(statusFilter)
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
  returns: v.union(v.any(), v.null()),
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
  returns: v.id("images"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to create images");
    }

    return await ctx.db.insert("images", {
      ...args,
      tags: [...args.tags, "original"], // Tag as original user upload
      uploadedBy: userId,
      likes: 0,
      views: 0,
      uploadedAt: Date.now(),
    });
  },
});

export const createExternal = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.string(),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
    storagePath: v.optional(v.string()),
    externalId: v.optional(v.string()),
    sourceType: v.optional(
      v.union(
        v.literal("upload"),
        v.literal("discord"),
        v.literal("pinterest"),
        v.literal("ai")
      )
    ),
    sourceUrl: v.optional(v.string()),
    importBatchId: v.optional(v.id("importBatches")),
  },
  returns: v.id("images"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to create images");
    }

    if (args.externalId) {
      const existing = await ctx.db
        .query("images")
        .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
        .unique();
      if (existing) return existing._id;
    }

    const existingByUrl = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) => q.eq(q.field("imageUrl"), args.imageUrl))
      .take(1);
    if (existingByUrl[0]) return existingByUrl[0]._id;

    const title = args.title || "Untitled";
    const category = args.category || "General";
    const tags = args.tags ? [...new Set([...args.tags, "original"])] : ["original"];
    const isDiscordImport = args.sourceType === "discord";
    const projectName = isDiscordImport ? title : undefined;

    const imageId = await ctx.db.insert("images", {
      title,
      description: args.description,
      imageUrl: args.imageUrl,
      tags,
      category,
      projectName,
      source: args.source,
      sref: args.sref,
      uploadedBy: userId,
      likes: 0,
      views: 0,
      status: isDiscordImport ? "pending" : "active",
      aiStatus: isDiscordImport ? "queued" : "processing",
      uploadedAt: Date.now(),
      storageProvider: "nextcloud",
      storagePath: args.storagePath,
      externalId: args.externalId,
      sourceType: args.sourceType,
      sourceUrl: args.sourceUrl,
      importBatchId: args.importBatchId,
      ingestedAt: Date.now(),
    });

    if (isDiscordImport) {
      try {
        await ctx.scheduler.runAfter(0, internalApi.discordNotifications.postStatus, {
          event: "queued",
          imageId,
          title,
          sref: args.sref,
          sourceUrl: args.sourceUrl,
          userId,
          imageUrl: args.imageUrl,
        });
      } catch (error) {
        console.warn("Failed to schedule Discord queued notification", error);
      }
    }

    if (!isDiscordImport) {
      await ctx.scheduler.runAfter(0, internal.vision.internalSmartAnalyzeImage, {
        imageId,
        userId,
        imageUrl: args.imageUrl,
        title,
        description: args.description,
        tags,
        category,
        source: args.source,
        sref: args.sref,
        variationCount: 0,
      });
    }

    return imageId;
  },
});

export const ingestExternal = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.string(),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
    storagePath: v.optional(v.string()),
    externalId: v.optional(v.string()),
    sourceType: v.optional(
      v.union(
        v.literal("upload"),
        v.literal("discord"),
        v.literal("pinterest"),
        v.literal("ai")
      )
    ),
    sourceUrl: v.optional(v.string()),
    importBatchId: v.optional(v.id("importBatches")),
  },
  returns: v.id("images"),
  handler: async (ctx, args) => {
    if (args.externalId) {
      const existing = await ctx.db
        .query("images")
        .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
        .unique();
      if (existing) return existing._id;
    }

    const existingByUrl = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", args.userId))
      .filter((q) => q.eq(q.field("imageUrl"), args.imageUrl))
      .take(1);
    if (existingByUrl[0]) return existingByUrl[0]._id;

    const title = args.title || "Untitled";
    const category = args.category || "General";
    const tags = args.tags ? [...new Set([...args.tags, "original"])] : ["original"];
    const isDiscordImport = args.sourceType === "discord";
    const projectName = isDiscordImport ? title : undefined;

    const imageId = await ctx.db.insert("images", {
      title,
      description: args.description,
      imageUrl: args.imageUrl,
      tags,
      category,
      projectName,
      source: args.source,
      sref: args.sref,
      uploadedBy: args.userId,
      likes: 0,
      views: 0,
      status: isDiscordImport ? "pending" : "active",
      aiStatus: isDiscordImport ? "queued" : "processing",
      uploadedAt: Date.now(),
      storageProvider: "nextcloud",
      storagePath: args.storagePath,
      externalId: args.externalId,
      sourceType: args.sourceType,
      sourceUrl: args.sourceUrl,
      importBatchId: args.importBatchId,
      ingestedAt: Date.now(),
    });

    if (isDiscordImport) {
      try {
        await ctx.scheduler.runAfter(0, internalApi.discordNotifications.postStatus, {
          event: "queued",
          imageId,
          title,
          sref: args.sref,
          sourceUrl: args.sourceUrl,
          userId: args.userId,
          imageUrl: args.imageUrl,
        });
      } catch (error) {
        console.warn("Failed to schedule Discord queued notification", error);
      }
    }

    if (!isDiscordImport) {
      await ctx.scheduler.runAfter(0, internal.vision.internalSmartAnalyzeImage, {
        imageId,
        userId: args.userId,
        imageUrl: args.imageUrl,
        title,
        description: args.description,
        tags,
        category,
        source: args.source,
        sref: args.sref,
        variationCount: 0,
      });
    }

    return imageId;
  },
});

export const ingestExternalHttp = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.INGEST_API_KEY;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!apiKey || token !== apiKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();

  if (!body?.imageUrl) {
    return new Response("Missing required fields: imageUrl", { status: 400 });
  }

  const resolvedUserId =
    typeof body.userId === "string" && body.userId.trim() ? body.userId : undefined;

  if (!resolvedUserId) {
    return new Response(
      "No target user found. Provide userId.",
      { status: 400 }
    );
  }

  const imageId = await ctx.runMutation(internal.images.ingestExternal, {
    userId: resolvedUserId as any,
    title: body.title || "Discord Import",
    description: body.description,
    imageUrl: body.imageUrl,
    tags: body.tags,
    category: body.category,
    source: body.source,
    sref: body.sref,
    storagePath: body.storagePath,
    externalId: body.externalId,
    sourceType: body.sourceType,
    sourceUrl: body.sourceUrl,
    importBatchId: body.importBatchId,
  });

  return new Response(JSON.stringify({ imageId, userId: resolvedUserId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

export const internalListDiscordQueue = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const takeLimit = Math.min(Math.max(args.limit ?? 5, 1), 25);
    const scanLimit = Math.min(Math.max(takeLimit * 6, 40), 200);
    const pending = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .take(scanLimit);

    const filtered = [];
    for (const image of pending) {
      if (!(await isDiscordLineage(ctx, image))) continue;
      const root = await resolveLineageRoot(ctx, image);
      filtered.push({
        ...image,
        lineageRootImageId: root?._id,
        lineageRootTitle: root?.title,
      });
    }
    return filtered.slice(0, takeLimit);
  },
});

export const internalModerateDiscordImage = internalMutation({
  args: {
    userId: v.id("users"),
    imageId: v.id("images"),
    action: v.union(v.literal("approve"), v.literal("reject"), v.literal("generate")),
    variationCount: v.optional(v.number()),
    modificationMode: v.optional(v.string()),
    variationDetail: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    message: v.string(),
    status: v.optional(v.string()),
    aiStatus: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const image = await ctx.db.get("images", args.imageId);
    if (!image) throw new Error("Image not found");
    if (image.uploadedBy !== args.userId) {
      throw new Error("Image does not belong to provided userId");
    }

    if (args.action === "approve") {
      if (image.status === "active") {
        return {
          ok: true,
          message: "Image already active.",
          status: image.status,
          aiStatus: image.aiStatus,
        };
      }

      const shouldRunDiscordAnalysis =
        image.sourceType === "discord" && image.aiStatus === "queued";
      await ctx.db.patch(args.imageId, {
        status: "active",
        aiStatus: shouldRunDiscordAnalysis ? "processing" : image.aiStatus,
      });

      if (shouldRunDiscordAnalysis) {
        await ctx.scheduler.runAfter(0, internal.vision.internalSmartAnalyzeImage, {
          imageId: image._id,
          userId: args.userId,
          imageUrl: image.imageUrl,
          title: image.title,
          description: image.description,
          tags: image.tags,
          category: image.category,
          source: image.source,
          sref: image.sref,
          variationCount: 0,
        });
      }

      if (await isDiscordLineage(ctx, image)) {
        const root = await resolveLineageRoot(ctx, image);
        try {
          await ctx.scheduler.runAfter(0, internalApi.discordNotifications.postStatus, {
            event: "approved",
            imageId: image._id,
            title: image.title,
            sref: image.sref || root?.sref,
            sourceUrl: image.sourceUrl || root?.sourceUrl,
            userId: args.userId,
            imageUrl: image.imageUrl,
            parentImageId: image.parentImageId,
          });
        } catch (error) {
          console.warn("Failed to schedule Discord approved notification", error);
        }
      }

      return {
        ok: true,
        message: "Image approved.",
        status: "active",
        aiStatus: shouldRunDiscordAnalysis ? "processing" : image.aiStatus,
      };
    }

    if (args.action === "reject") {
      if (await isDiscordLineage(ctx, image)) {
        const root = await resolveLineageRoot(ctx, image);
        try {
          await ctx.scheduler.runAfter(0, internalApi.discordNotifications.postStatus, {
            event: "rejected",
            imageId: image._id,
            title: image.title,
            sref: image.sref || root?.sref,
            sourceUrl: image.sourceUrl || root?.sourceUrl,
            userId: args.userId,
            imageUrl: image.imageUrl,
            parentImageId: image.parentImageId,
          });
        } catch (error) {
          console.warn("Failed to schedule Discord rejected notification", error);
        }
      }

      if (image.storageId) {
        await ctx.storage.delete(image.storageId);
      }
      await ctx.db.delete(args.imageId);
      return { ok: true, message: "Image rejected and deleted." };
    }

    if (image.status !== "active") {
      throw new Error("Image must be approved (active) before generating variations.");
    }
    if (image.aiStatus === "processing") {
      throw new Error("Image is already processing.");
    }

    const variationCount = Math.min(Math.max(args.variationCount ?? 2, 1), 12);
    const modificationMode = args.modificationMode || "shot-variation";
    await ctx.db.patch(args.imageId, {
      aiStatus: "processing",
      variationCount,
      modificationMode,
      variationDetail: args.variationDetail,
    });

    await ctx.scheduler.runAfter(0, internal.vision.internalGenerateRelatedImages, {
      originalImageId: args.imageId,
      storageId: image.storageId,
      imageUrl: image.imageUrl,
      description: image.description || "",
      category: image.category,
      style: undefined,
      title: image.title,
      aspectRatio: args.aspectRatio,
      group: image.group,
      variationCount,
      modificationMode,
      variationDetail: args.variationDetail,
    });

    if (await isDiscordLineage(ctx, image)) {
      const root = await resolveLineageRoot(ctx, image);
      try {
        await ctx.scheduler.runAfter(0, internalApi.discordNotifications.postStatus, {
          event: "generation_started",
          imageId: image._id,
          title: image.title,
          sref: image.sref || root?.sref,
          sourceUrl: image.sourceUrl || root?.sourceUrl,
          userId: args.userId,
          imageUrl: image.imageUrl,
          parentImageId: image.parentImageId,
        });
      } catch (error) {
        console.warn("Failed to schedule Discord generation-started notification", error);
      }
    }

    return {
      ok: true,
      message: `Started generation (${variationCount} variation${variationCount !== 1 ? "s" : ""}).`,
      status: image.status,
      aiStatus: "processing",
    };
  },
});

export const discordQueueHttp = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.INGEST_API_KEY;
  const token = readBearerToken(request);
  if (!apiKey || token !== apiKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const resolvedUserId = parseUserIdFromBody(body);
  if (!resolvedUserId) {
    return new Response("No target user found. Provide userId.", { status: 400 });
  }

  const limitRaw = Number.parseInt(String(body?.limit ?? ""), 10);
  const limit = Number.isNaN(limitRaw) ? 5 : limitRaw;
  let items = await ctx.runQuery(internalApi.images.internalListDiscordQueue, {
    userId: resolvedUserId as any,
    limit,
  });

  if (typeof body?.imageId === "string" && body.imageId.trim()) {
    items = items.filter((item: any) => String(item._id) === body.imageId.trim());
  }

  return new Response(JSON.stringify({ items, userId: resolvedUserId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

export const discordModerateHttp = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.INGEST_API_KEY;
  const token = readBearerToken(request);
  if (!apiKey || token !== apiKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const resolvedUserId = parseUserIdFromBody(body);
  if (!resolvedUserId) {
    return new Response("No target user found. Provide userId.", { status: 400 });
  }

  const imageId =
    typeof body?.imageId === "string" && body.imageId.trim() ? body.imageId.trim() : null;
  if (!imageId) {
    return new Response("Missing required field: imageId", { status: 400 });
  }

  const action = body?.action;
  if (action !== "approve" && action !== "reject" && action !== "generate") {
    return new Response("Invalid action. Use approve, reject, or generate.", { status: 400 });
  }

  try {
    const result = await ctx.runMutation(internalApi.images.internalModerateDiscordImage, {
      userId: resolvedUserId as any,
      imageId: imageId as any,
      action,
      variationCount: body?.variationCount,
      modificationMode: body?.modificationMode,
      variationDetail: body?.variationDetail,
      aspectRatio: body?.aspectRatio,
    });
    return new Response(JSON.stringify({ ...result, imageId, userId: resolvedUserId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(error?.message || "Moderation failed", { status: 400 });
  }
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
  returns: v.id("images"),
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
  returns: v.boolean(),
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
    if (!image) return null;
    
    await ctx.db.patch("images", args.imageId, {
      views: image.views + 1,
    });
    return null;
  },
});

// Broad type (e.g. Type): Commercial, Film, Moodboard, etc.
export const GROUPS = [
  "Commercial", "Film", "Moodboard", "Spec Commercial", "Spec Music Video",
  "Music Video", "TV Series", "Web Series", "Video Game Cinematic",
] as const;

export const getGroups = query({
  args: {},
  returns: v.array(v.string()),
  handler: async () => [...GROUPS],
});

export const getCategories = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const images = await ctx.db.query("images").collect();
    const existingCategories = new Set(images.map(img => img.category));
    
    const defaultCategories = [
      "Abstract", "Architecture", "Art", "Blockbuster Film", "Character Design", 
      "Cinematic", "Commercial", "Design", "Environment", "Fashion", "Film", 
      "Gaming", "Headshot", "Indy Film", "Illustration", "Interior", "Landscape", 
      "Photography", "Sci-Fi", "Streetwear", "Technology", "Texture", "UI/UX", "Vintage"
    ];

    const allCategories = new Set([...defaultCategories, ...existingCategories]);
    return [...allCategories].sort();
  },
});

export const internalGenerateUploadUrl = internalMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
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
      // Variation count: 0 means no auto-generation at upload (user decides later)
      variationCount: v.optional(v.number()),
    })),
  },
  returns: v.array(v.id("images")),
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

        // Create the image record - NO variation settings at upload time
        const imageId = await ctx.db.insert("images", {
          title: upload.title,
          description: upload.description,
          imageUrl,
          storageId: upload.storageId,
          tags: [...upload.tags, "original"], // Tag as original user upload
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

        // Schedule the smart analysis action - NO variation generation at upload
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
            sref: upload.sref || undefined,
            // No variations at upload - user decides after reviewing
            variationCount: 0,
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
  returns: v.array(v.any()),
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
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    for (const id of args.imageIds) {
      const image = await ctx.db.get("images", id);
      if (image && image.uploadedBy === userId) {
        await ctx.db.patch("images", id, { status: "active" });
      }
    }
    return null;
  },
});

export const getProcessingImages = query({
  args: {},
  returns: v.array(v.any()),
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
  returns: v.array(v.any()),
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
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const image = await ctx.db.get("images", args.imageId);
    if (!image) throw new Error("Image not found");

    if (image.uploadedBy !== userId) throw new Error("Not authorized");

    const shouldRunDiscordAnalysis =
      image.sourceType === "discord" && image.aiStatus === "queued";
    await ctx.db.patch("images", args.imageId, {
      status: "active",
      aiStatus: shouldRunDiscordAnalysis ? "processing" : image.aiStatus,
    });

    if (shouldRunDiscordAnalysis) {
      await ctx.scheduler.runAfter(0, internal.vision.internalSmartAnalyzeImage, {
        imageId: image._id,
        userId,
        imageUrl: image.imageUrl,
        title: image.title,
        description: image.description,
        tags: image.tags,
        category: image.category,
        source: image.source,
        sref: image.sref,
        variationCount: 0,
      });
    }

    if (await isDiscordLineage(ctx, image)) {
      const root = await resolveLineageRoot(ctx, image);
      try {
        await ctx.scheduler.runAfter(0, internalApi.discordNotifications.postStatus, {
          event: "approved",
          imageId: image._id,
          title: image.title,
          sref: image.sref || root?.sref,
          sourceUrl: image.sourceUrl || root?.sourceUrl,
          userId,
          imageUrl: image.imageUrl,
          parentImageId: image.parentImageId,
        });
      } catch (error) {
        console.warn("Failed to schedule Discord approved notification", error);
      }
    }
    return null;
  },
});

export const rejectImage = mutation({
  args: { imageId: v.id("images") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const image = await ctx.db.get("images", args.imageId);
    if (!image) throw new Error("Image not found");

    if (image.uploadedBy !== userId) throw new Error("Not authorized");

    if (await isDiscordLineage(ctx, image)) {
      const root = await resolveLineageRoot(ctx, image);
      try {
        await ctx.scheduler.runAfter(0, internalApi.discordNotifications.postStatus, {
          event: "rejected",
          imageId: image._id,
          title: image.title,
          sref: image.sref || root?.sref,
          sourceUrl: image.sourceUrl || root?.sourceUrl,
          userId,
          imageUrl: image.imageUrl,
          parentImageId: image.parentImageId,
        });
      } catch (error) {
        console.warn("Failed to schedule Discord rejected notification", error);
      }
    }

    if (image.storageId) {
      await ctx.storage.delete(image.storageId);
    }
    await ctx.db.delete("images", args.imageId);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("images") },
  returns: v.object({ success: v.boolean() }),
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
  returns: v.null(),
  handler: async (ctx, args) => {
    const existingImage = await ctx.db.get("images", args.imageId);
    const patch: any = {
      description: args.description,
      colors:
        existingImage?.sourceType === "discord" && existingImage.colors && existingImage.colors.length > 0
          ? existingImage.colors
          : args.colors,
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
    return null;
  },
});

export const internalSetAiStatus = internalMutation({
  args: {
    imageId: v.id("images"),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("images", args.imageId, { aiStatus: args.status });
    return null;
  },
});

export const updateAnalysis = mutation({
  args: {
    imageId: v.id("images"),
    description: v.string(),
    colors: v.array(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
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
    colors: v.optional(v.array(v.string())),
    group: v.optional(v.string()),
    projectName: v.optional(v.string()),
    moodboardName: v.optional(v.string()),
    uniqueId: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const image = await ctx.db.get("images", args.imageId);
    if (!image) {
      throw new Error("Image not found");
    }
    // Allow any authenticated user to edit image metadata (tags, title, description, etc.)
    // This is a curation tool, so users should be able to organize any images

    const patch: any = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.category !== undefined) patch.category = args.category;
    if (args.source !== undefined) patch.source = args.source;
    if (args.sref !== undefined) patch.sref = args.sref;
    if (args.colors !== undefined) patch.colors = args.colors;
    if (args.group !== undefined) patch.group = args.group;
    if (args.projectName !== undefined) patch.projectName = args.projectName;
    if (args.moodboardName !== undefined) patch.moodboardName = args.moodboardName;
    if (args.uniqueId !== undefined) patch.uniqueId = args.uniqueId;

    await ctx.db.patch("images", args.imageId, patch);

    return { success: true };
  },
});

/** Set order of images in a project row (and optionally move images to that project). Syncs from project-rows drag-and-drop. */
export const setProjectRowOrder = mutation({
  args: {
    projectName: v.string(),
    imageIds: v.array(v.id("images")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getAuthUserId(ctx);
    for (let i = 0; i < args.imageIds.length; i++) {
      const image = await ctx.db.get("images", args.imageIds[i]);
      if (image) {
        await ctx.db.patch("images", args.imageIds[i], {
          projectName: args.projectName,
          projectOrder: i,
        });
      }
    }
    return null;
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
  returns: v.null(),
  handler: async (ctx, args) => {
    const originalImage = await ctx.db.get("images", args.originalImageId);
    if (!originalImage) return;
    const root = await resolveLineageRoot(ctx, originalImage);
    const discordLineage = await isDiscordLineage(ctx, originalImage);
    const inheritedSourceType = discordLineage ? "discord" : "ai";

    for (const img of args.images) {
      const childImageId = await ctx.db.insert("images", {
        title: originalImage.title, // Inherit parent's exact title so they group together
        description: originalImage.description || img.description, // Inherit parent's full description
        imageUrl: img.url,
        // Inherit metadata from original (which might have been updated by analysis)
        category: originalImage.category,
        tags: [...originalImage.tags, "generated", "variation"],
        colors: originalImage.colors || [], // Inherit parent's colors (from Qwen VL analysis)
        uploadedBy: originalImage.uploadedBy,
        likes: 0,
        views: 0,
        source: "AI Generation",
        sourceType: inheritedSourceType,
        sourceUrl: originalImage.sourceUrl || root?.sourceUrl,
        // Inherit group, projectName, moodboardName, uniqueId from parent
        group: originalImage.group,
        projectName: originalImage.projectName,
        moodboardName: originalImage.moodboardName,
        uniqueId: originalImage.uniqueId,
        variationCount: originalImage.variationCount,
        modificationMode: originalImage.modificationMode,
        // Carry sref from root/parent so child variations preserve the same reference lineage
        sref: originalImage.sref || root?.sref,
        parentImageId: args.originalImageId, // Link back to parent image (lineage tracking)
        status: "pending",
        uploadedAt: Date.now(),
      });

      if (discordLineage) {
        try {
          await ctx.scheduler.runAfter(0, internalApi.discordNotifications.postStatus, {
            event: "generated",
            imageId: childImageId,
            parentImageId: originalImage._id,
            title: originalImage.title,
            sref: originalImage.sref || root?.sref,
            sourceUrl: originalImage.sourceUrl || root?.sourceUrl,
            userId: originalImage.uploadedBy,
            imageUrl: img.url,
          });
        } catch (error) {
          console.warn("Failed to schedule Discord generated notification", error);
        }
      }
    }

    // Mark original image processing as completed
    await ctx.db.patch("images", args.originalImageId, { aiStatus: "completed" });
    return null;
  },
});
