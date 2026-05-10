import { v } from "convex/values";
import { httpAction, query, mutation, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { preferredImageUrlForSampling } from "./colorExtractionUrls";
const internalApi = internal as any;

const MAX_DISCORD_LINEAGE_DEPTH = 12;
const CANONICAL_NEXTCLOUD_PUBLIC_TOKEN = "afc53c40a68aade";
const RUSTFS_PUBLIC_HOST = "s3.v1su4.dev";

/**
 * Reject paths that contain traversal sequences or absolute path components.
 * Throws if the path is unsafe.
 */
function assertSafeStoragePath(path: string, field: string): void {
  const segments = path.split(/[/\\]/);
  if (segments.some((s) => s === ".." || s === ".")) {
    throw new Error(`Invalid ${field}: path traversal not allowed`);
  }
  if (path.startsWith("/") || path.startsWith("\\")) {
    throw new Error(`Invalid ${field}: absolute paths not allowed`);
  }
}

function collectNextcloudPaths(image: Partial<Doc<"images">>): string[] {
  return [
    image?.storagePath,
    image?.previewStoragePath,
    image?.derivativeStoragePaths?.small,
    image?.derivativeStoragePaths?.medium,
    image?.derivativeStoragePaths?.large,
  ].filter(
    (path): path is string => typeof path === "string" && path.trim().length > 0
  );
}

function storageProviderFromPayload(args: {
  storageProvider?: "convex" | "nextcloud" | "rustfs";
  storageBucket?: string;
  imageUrl?: string;
  storagePath?: string;
}) {
  if (args.storageProvider) return args.storageProvider;
  if (args.storageBucket || parseUrlHost(args.imageUrl) === RUSTFS_PUBLIC_HOST) return "rustfs";
  if (args.storagePath) return "nextcloud";
  return undefined;
}

async function scheduleStorageCleanup(ctx: any, image: any) {
  const paths = collectNextcloudPaths(image);
  if (paths.length === 0) return;
  if (image.storageProvider === "rustfs" || image.storageBucket) {
    try {
      await ctx.scheduler.runAfter(0, internalApi.mediaStorage.cleanupRustfsObjects, {
        bucket: image.storageBucket || "pindeck",
        paths,
      });
    } catch (error) {
      console.warn("Failed to schedule RustFS cleanup", error);
    }
    return;
  }
  try {
    await ctx.scheduler.runAfter(0, internalApi.mediaStorage.cleanupNextcloudPaths, {
      paths,
    });
  } catch (error) {
    console.warn("Failed to schedule Nextcloud cleanup", error);
  }
}

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

function normalizeExternalImageUrl(rawUrl: unknown): string {
  const value = String(rawUrl ?? "").trim();
  if (!value) return "";
  if (value.startsWith("<") && value.endsWith(">")) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function parseUrlHost(rawUrl: unknown): string | undefined {
  try {
    return new URL(String(rawUrl ?? "")).host.toLowerCase();
  } catch {
    return undefined;
  }
}

function isCloudHostedUrl(rawUrl: unknown): boolean {
  return parseUrlHost(rawUrl) === "cloud.v1su4.dev";
}

function isCanonicalCloudUrl(rawUrl: unknown): boolean {
  try {
    const parsed = new URL(String(rawUrl ?? ""));
    return (
      parsed.host.toLowerCase() === "cloud.v1su4.dev" &&
      parsed.pathname.startsWith(
        `/public.php/dav/files/${CANONICAL_NEXTCLOUD_PUBLIC_TOKEN}/`
      )
    );
  } catch {
    return false;
  }
}

function isRustfsUrl(rawUrl: unknown): boolean {
  return parseUrlHost(rawUrl) === RUSTFS_PUBLIC_HOST;
}

function looksLikeHttpUrl(rawUrl: unknown): rawUrl is string {
  const value = String(rawUrl ?? "").trim();
  return value.startsWith("http://") || value.startsWith("https://");
}

function pickBackfillSourceUrl(image: any): string | undefined {
  const candidates = [image?.imageUrl, image?.previewUrl, image?.sourceUrl];
  for (const candidate of candidates) {
    if (!looksLikeHttpUrl(candidate)) continue;
    return candidate;
  }
  return undefined;
}

function hasCollapsedNextcloudVariants(image: any): boolean {
  if (!image?.storagePath || image?.storageProvider !== "nextcloud") {
    return false;
  }

  const derivativePaths = image?.derivativeStoragePaths;
  const derivativeUrls = image?.derivativeUrls;
  if (!derivativePaths || !derivativeUrls) {
    return true;
  }

  const collapsedPaths =
    derivativePaths.small === image.storagePath &&
    derivativePaths.medium === image.storagePath &&
    derivativePaths.large === image.storagePath;

  const collapsedUrls =
    derivativeUrls.small === image.imageUrl &&
    derivativeUrls.medium === image.imageUrl &&
    derivativeUrls.large === image.imageUrl;

  return collapsedPaths || collapsedUrls;
}

function mapImageForDisplay<T extends Record<string, any>>(image: T): T {
  return image;
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
        .withIndex("by_group", (q) => q.eq("group", args.group))
        .filter((q) =>
          q.and(
            statusFilter(q),
            q.eq(q.field("category"), args.category)
          )
        )
        .order("desc")
        .take(args.limit || 50);
    } else if (args.group) {
      images = await ctx.db
        .query("images")
        .withIndex("by_group", (q) => q.eq("group", args.group))
        .filter(statusFilter)
        .order("desc")
        .take(args.limit || 50);
    } else if (args.category) {
      const category = args.category;
      images = await ctx.db
        .query("images")
        .withIndex("by_category", (q) => q.eq("category", category))
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
        
        return mapImageForDisplay({
          ...image,
          isLiked,
        });
      })
    );

    return imagesWithLikes;
  },
});

const aggregationEntry = v.object({ value: v.string(), count: v.number() });

/** Counts for sidebar TYPE / GENRE / STYLE (same scope as `list`: active or undefined status). */
export const libraryAggregations = query({
  args: {},
  returns: v.object({
    total: v.number(),
    byGroup: v.array(aggregationEntry),
    byGenre: v.array(aggregationEntry),
    byStyle: v.array(aggregationEntry),
  }),
  handler: async (ctx) => {
    const all = await ctx.db.query("images").collect();
    const images = all.filter(
      (img) => img.status === "active" || img.status === undefined
    );
    const bump = (m: Map<string, number>, raw: string | undefined) => {
      const key = raw?.trim() ? raw.trim() : "";
      m.set(key, (m.get(key) ?? 0) + 1);
    };
    const genres = new Map<string, number>();
    const styles = new Map<string, number>();
    const groups = new Map<string, number>();

    for (const img of images) {
      bump(groups, img.group);
      if (img.genre?.trim()) {
        const g = img.genre.trim();
        genres.set(g, (genres.get(g) ?? 0) + 1);
      }
      if (img.style?.trim()) {
        const s = img.style.trim();
        styles.set(s, (styles.get(s) ?? 0) + 1);
      }
    }

    const sortCounts = (m: Map<string, number>) =>
      Array.from(m.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

    return {
      total: images.length,
      byGroup: sortCounts(groups),
      byGenre: sortCounts(genres),
      byStyle: sortCounts(styles),
    };
  },
});

/** Schedule VLM re-analysis for current user's images (fills group, genre, shot, style). */
export const enqueueCinematicMetadataBackfill = mutation({
  args: {
    onlyMissing: v.optional(v.boolean()),
    staggerMs: v.optional(v.number()),
    forceAll: v.optional(v.boolean()),
    imageIds: v.optional(v.array(v.id("images"))),
  },
  returns: v.object({ scheduled: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stagger = Math.max(500, args.staggerMs ?? 4500);
    const onlyMissing = args.forceAll !== true && (args.onlyMissing !== false);

    const mine = args.imageIds
      ? (await Promise.all(args.imageIds.map((id) => ctx.db.get(id))))
          .filter((img): img is NonNullable<typeof img> => img !== null && img.uploadedBy === userId)
      : await ctx.db
          .query("images")
          .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
          .collect();

    const targets = onlyMissing
      ? mine.filter((img) => {
          const g = img.genre?.trim();
          const sh = img.shot?.trim();
          const sty = img.style?.trim();
          const grp = img.group?.trim();
          return !(g && sh && sty && grp);
        })
      : mine;

    let delay = 0;
    let scheduled = 0;
    let skipped = 0;

    for (const img of targets) {
      const sourceStorageId = img.storageId;
      const sourceImageUrl = img.imageUrl;
      if (!sourceStorageId && !sourceImageUrl) {
        skipped += 1;
        continue;
      }

      await ctx.scheduler.runAfter(delay, internal.vision.internalSmartAnalyzeImage, {
        storageId: sourceStorageId,
        imageUrl: sourceImageUrl,
        imageId: img._id,
        userId,
        title: img.title,
        description: img.description || "",
        tags: img.tags,
        category: img.category,
        source: img.source,
        sref: img.sref,
        group: img.group,
        projectName: img.projectName,
        moodboardName: img.moodboardName,
        variationCount: 0,
        modificationMode: img.modificationMode ?? "shot-variation",
        variationType: img.variationType,
        variationDetail: img.variationDetail,
      });
      delay += stagger;
      scheduled += 1;
    }

    return { scheduled, skipped };
  },
});

/** Schedule one refresh pass for image metadata and sampled palettes. */
export const enqueueMetadataRefresh = mutation({
  args: {
    onlyMissing: v.optional(v.boolean()),
    staggerMs: v.optional(v.number()),
    forceAll: v.optional(v.boolean()),
    imageIds: v.optional(v.array(v.id("images"))),
  },
  returns: v.object({
    metadataScheduled: v.number(),
    paletteScheduled: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stagger = Math.max(0, args.staggerMs ?? 0);
    const onlyMissing = args.forceAll !== true && (args.onlyMissing !== false);

    const mine = args.imageIds
      ? (await Promise.all(args.imageIds.map((id) => ctx.db.get(id))))
          .filter((img): img is NonNullable<typeof img> => img !== null)
      : await ctx.db
          .query("images")
          .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
          .collect();

    const refreshPlan = mine
      .map((img) => {
        const g = img.genre?.trim();
        const sh = img.shot?.trim();
        const sty = img.style?.trim();
        const grp = img.group?.trim();
        const metadataMissing = !(g && sh && sty && grp);
        const paletteMissing = !img.colors?.length;
        return {
          img,
          metadataMissing,
          paletteMissing,
          runMetadata: args.forceAll === true || metadataMissing,
          forcePalette: paletteMissing,
        };
      })
      .filter((plan) => !onlyMissing || plan.metadataMissing || plan.paletteMissing);

    let delay = 0;
    let metadataScheduled = 0;
    let paletteScheduled = 0;
    let skipped = 0;

    for (const plan of refreshPlan) {
      const { img } = plan;
      const paletteUrl = preferredImageUrlForSampling(img);
      const sourceStorageId = img.storageId;
      const sourceImageUrl = img.imageUrl;
      if (!paletteUrl || (!sourceStorageId && !sourceImageUrl)) {
        skipped += 1;
        continue;
      }

      await ctx.db.patch(img._id, { aiStatus: "processing" });
      await ctx.scheduler.runAfter(delay, (internal as any).images.internalRefreshMetadataAfterPalette, {
        imageId: img._id,
        userId,
        paletteUrl,
        forcePalette: plan.forcePalette,
        runMetadata: plan.runMetadata,
      });
      delay += stagger;
      paletteScheduled += 1;
      if (plan.runMetadata) metadataScheduled += 1;
    }

    return { metadataScheduled, paletteScheduled, skipped };
  },
});

export const internalRefreshMetadataAfterPalette = internalAction({
  args: {
    imageId: v.id("images"),
    userId: v.id("users"),
    paletteUrl: v.string(),
    forcePalette: v.optional(v.boolean()),
    runMetadata: v.optional(v.boolean()),
  },
  returns: v.object({
    paletteOk: v.boolean(),
    metadataRan: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const image = await ctx.runQuery((internal as any).images.internalGetMetadataRefreshPayload, {
      imageId: args.imageId,
      userId: args.userId,
    });
    if (!image) return { paletteOk: false, metadataRan: false };

    let paletteOk = Boolean(image.colors?.length) && args.forcePalette !== true;
    if (!paletteOk) {
      const palette = await ctx.runAction(
        (internal as any).colorExtraction.internalExtractAndStoreColors,
        { imageId: args.imageId, imageUrl: args.paletteUrl }
      );
      paletteOk = Boolean(palette?.ok && palette.colors?.length);
    }

    if (!paletteOk) {
      await ctx.runMutation((internal as any).images.internalSetAiStatus, {
        imageId: args.imageId,
        status: "failed",
      });
      return { paletteOk: false, metadataRan: false };
    }

    if (args.runMetadata === false) {
      await ctx.runMutation((internal as any).images.internalSetAiStatus, {
        imageId: args.imageId,
        status: "completed",
      });
      return { paletteOk: true, metadataRan: false };
    }

    await ctx.runAction((internal as any).vision.internalSmartAnalyzeImage, {
      storageId: image.storageId,
      imageUrl: image.imageUrl,
      imageId: image._id,
      userId: args.userId,
      title: image.title,
      description: image.description || "",
      tags: image.tags,
      category: image.category,
      source: image.source,
      sref: image.sref,
      group: image.group,
      projectName: image.projectName,
      moodboardName: image.moodboardName,
      variationCount: 0,
      modificationMode: image.modificationMode ?? "shot-variation",
      variationType: image.variationType,
      variationDetail: image.variationDetail,
    });

    return { paletteOk: true, metadataRan: true };
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
      const category = args.category;
      const group = args.group;
      images = await ctx.db
        .query("images")
        .withSearchIndex("search_content", (q) =>
          q.search("title", args.searchTerm).eq("category", category).eq("group", group)
        )
        .filter(statusFilter)
        .take(50);
    } else if (args.category) {
      const category = args.category;
      images = await ctx.db
        .query("images")
        .withSearchIndex("search_content", (q) =>
          q.search("title", args.searchTerm).eq("category", category)
        )
        .filter(statusFilter)
        .take(50);
    } else if (args.group) {
      const group = args.group;
      images = await ctx.db
        .query("images")
        .withSearchIndex("search_content", (q) =>
          q.search("title", args.searchTerm).eq("group", group)
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
        
        return mapImageForDisplay({
          ...image,
          isLiked,
        });
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

    return mapImageForDisplay({
      ...image,
      isLiked,
    });
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
    previewUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
    storagePath: v.optional(v.string()),
    storageProvider: v.optional(
      v.union(v.literal("convex"), v.literal("nextcloud"), v.literal("rustfs"))
    ),
    storageBucket: v.optional(v.string()),
    previewStoragePath: v.optional(v.string()),
    derivativeUrls: v.optional(
      v.object({
        small: v.string(),
        medium: v.string(),
        large: v.string(),
      })
    ),
    derivativeStoragePaths: v.optional(
      v.object({
        small: v.string(),
        medium: v.string(),
        large: v.string(),
      })
    ),
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

    if (args.storagePath) assertSafeStoragePath(args.storagePath, "storagePath");
    if (args.previewStoragePath) assertSafeStoragePath(args.previewStoragePath, "previewStoragePath");
    if (args.derivativeStoragePaths) {
      assertSafeStoragePath(args.derivativeStoragePaths.small, "derivativeStoragePaths.small");
      assertSafeStoragePath(args.derivativeStoragePaths.medium, "derivativeStoragePaths.medium");
      assertSafeStoragePath(args.derivativeStoragePaths.large, "derivativeStoragePaths.large");
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
    const storageProvider = storageProviderFromPayload(args);
    const projectName = args.sourceType === "ai" ? undefined : title;

    const imageId = await ctx.db.insert("images", {
      title,
      description: args.description,
      imageUrl: args.imageUrl,
      previewUrl: args.previewUrl,
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
      storageProvider,
      storageBucket: args.storageBucket,
      storagePath: args.storagePath,
      previewStoragePath: args.previewStoragePath,
      derivativeUrls: args.derivativeUrls,
      derivativeStoragePaths: args.derivativeStoragePaths,
      nextcloudPersistStatus: args.storagePath ? "succeeded" : undefined,
      storagePersistStatus: args.storagePath ? "succeeded" : undefined,
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
    previewUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
    storagePath: v.optional(v.string()),
    storageProvider: v.optional(
      v.union(v.literal("convex"), v.literal("nextcloud"), v.literal("rustfs"))
    ),
    storageBucket: v.optional(v.string()),
    previewStoragePath: v.optional(v.string()),
    derivativeUrls: v.optional(
      v.object({
        small: v.string(),
        medium: v.string(),
        large: v.string(),
      })
    ),
    derivativeStoragePaths: v.optional(
      v.object({
        small: v.string(),
        medium: v.string(),
        large: v.string(),
      })
    ),
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
    const storageProvider = storageProviderFromPayload(args);
    const projectName = args.sourceType === "ai" ? undefined : title;

    const imageId = await ctx.db.insert("images", {
      title,
      description: args.description,
      imageUrl: args.imageUrl,
      previewUrl: args.previewUrl,
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
      storageProvider,
      storageBucket: args.storageBucket,
      storagePath: args.storagePath,
      previewStoragePath: args.previewStoragePath,
      derivativeUrls: args.derivativeUrls,
      derivativeStoragePaths: args.derivativeStoragePaths,
      nextcloudPersistStatus: args.storagePath ? "succeeded" : undefined,
      storagePersistStatus: args.storagePath ? "succeeded" : undefined,
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

  const sourceImageUrl = normalizeExternalImageUrl(body.imageUrl);
  if (!sourceImageUrl) {
    return new Response("Missing required fields: imageUrl", { status: 400 });
  }

  let persistedImage;
  try {
    persistedImage = await ctx.runAction(internalApi.mediaStorage.persistExternalImageFromUrl, {
      sourceUrl: sourceImageUrl,
      title: body.title || "Discord Import",
    });
  } catch (error: any) {
    console.error("Nextcloud persist failed during external ingest", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to persist image to Nextcloud",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const imageId = await ctx.runMutation(internal.images.ingestExternal, {
    userId: resolvedUserId,
    title: body.title || "Discord Import",
    description: body.description,
    imageUrl: persistedImage.imageUrl,
    previewUrl: persistedImage.previewUrl,
    tags: body.tags,
    category: body.category,
    source: body.source,
    sref: body.sref,
    storagePath: persistedImage.storagePath,
    storageProvider: persistedImage.bucket ? "rustfs" : "nextcloud",
    storageBucket: persistedImage.bucket,
    previewStoragePath: persistedImage.previewStoragePath,
    derivativeUrls: persistedImage.derivativeUrls,
    derivativeStoragePaths: persistedImage.derivativeStoragePaths,
    externalId: body.externalId,
    sourceType: body.sourceType,
    sourceUrl: body.sourceUrl || sourceImageUrl,
    importBatchId: body.importBatchId,
  });

  // Pixel-accurate server-side color sampling. Runs against the persisted
  // Nextcloud URL so we don't depend on cdn.discordapp.com CORS.
  await ctx.scheduler.runAfter(
    0,
    (internalApi as any).colorExtraction.internalExtractAndStoreColors,
    {
      imageId,
      imageUrl:
        preferredImageUrlForSampling(persistedImage) ?? persistedImage.imageUrl,
    }
  );

  return new Response(JSON.stringify({ imageId, userId: resolvedUserId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

export const backfillNextcloudHttp = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.INGEST_API_KEY;
  const token = readBearerToken(request);
  if (!apiKey || token !== apiKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(Number(body?.limit ?? 200), 1000));
  const dryRun = Boolean(body?.dryRun);
    const refreshVariants = Boolean(body?.refreshVariants);
    const imageIds = Array.isArray(body?.imageIds)
      ? body.imageIds.filter((id: unknown): id is string => typeof id === "string")
      : undefined;
    const images = await ctx.runQuery((internal as any).images.internalListBackfillCandidates, {
      limit,
      imageIds,
    });

  let migrated = 0;
  let failed = 0;
  let skipped = 0;
  const results: Array<Record<string, string | boolean | undefined>> = [];

  for (const image of images) {
    const hasStoredVariants =
      Boolean(image.previewStoragePath) &&
      Boolean(image.derivativeStoragePaths?.small) &&
      Boolean(image.derivativeStoragePaths?.medium) &&
      Boolean(image.derivativeStoragePaths?.large);

    const variantsNeedRefresh =
      Boolean(image.storagePath) &&
      (!hasStoredVariants ||
        image.imageUrl === image.derivativeUrls?.small ||
        image.imageUrl === image.derivativeUrls?.medium ||
        image.imageUrl === image.derivativeUrls?.large);

    const alreadyRustfs =
      image.storageProvider === "rustfs" ||
      (isRustfsUrl(image.imageUrl) && (!image.previewUrl || isRustfsUrl(image.previewUrl)));

    if (alreadyRustfs && !(refreshVariants && variantsNeedRefresh)) {
      skipped += 1;
      if (results.length < 50) {
        results.push({
          imageId: image._id,
          title: image.title,
          status: "already-rustfs",
        });
      }
      continue;
    }

    const mode = image.storagePath
      ? refreshVariants && variantsNeedRefresh
        ? "rebuild-variants"
        : "publish-existing"
      : pickBackfillSourceUrl(image)
        ? "re-upload-source"
        : "unrecoverable";

    if (dryRun) {
      if (mode === "unrecoverable") failed += 1;
      else migrated += 1;
      if (results.length < 50) {
        results.push({
          imageId: image._id,
          title: image.title,
          status: mode,
          imageUrl: image.imageUrl,
          sourceType: image.sourceType,
        });
      }
      continue;
    }

    try {
      if (image.storagePath) {
        const published =
          refreshVariants && variantsNeedRefresh
            ? await ctx.runAction((internal as any).mediaStorage.reprocessStoredImagePaths, {
                storagePath: image.storagePath,
                title: image.title,
              })
            : await ctx.runAction((internal as any).mediaStorage.publishStoredImagePaths, {
                storagePath: image.storagePath,
                previewStoragePath: image.previewStoragePath,
                derivativeStoragePaths: image.derivativeStoragePaths,
              });
        await ctx.runMutation((internal as any).images.internalApplyNextcloudUpload, {
          imageId: image._id,
          imageUrl: published.imageUrl,
          previewUrl: published.previewUrl,
          storageProvider: published.bucket ? "rustfs" : undefined,
          storageBucket: published.bucket,
          storagePath: published.storagePath ?? image.storagePath,
          previewStoragePath: published.previewStoragePath ?? image.previewStoragePath,
          derivativeUrls: published.derivativeUrls,
          derivativeStoragePaths:
            published.derivativeStoragePaths ?? image.derivativeStoragePaths,
        });
      } else {
        const sourceUrl = pickBackfillSourceUrl(image);
        if (!sourceUrl) {
          throw new Error("No recoverable source URL");
        }
        const persisted = await ctx.runAction((internal as any).mediaStorage.persistExternalImageFromUrl, {
          sourceUrl,
          title: image.title,
        });
        await ctx.runMutation((internal as any).images.internalApplyNextcloudUpload, {
          imageId: image._id,
          imageUrl: persisted.imageUrl,
          previewUrl: persisted.previewUrl,
          storageProvider: persisted.bucket ? "rustfs" : undefined,
          storageBucket: persisted.bucket,
          storagePath: persisted.storagePath,
          previewStoragePath: persisted.previewStoragePath,
          derivativeUrls: persisted.derivativeUrls,
          derivativeStoragePaths: persisted.derivativeStoragePaths,
        });
      }

      migrated += 1;
      if (results.length < 50) {
        results.push({
          imageId: image._id,
          title: image.title,
          status: mode,
        });
      }
    } catch (error: any) {
      failed += 1;
      await ctx.runMutation((internal as any).images.internalRecordNextcloudBackfillFailure, {
        imageId: image._id,
        error: error?.message || "Backfill failed",
      });
      if (results.length < 50) {
        results.push({
          imageId: image._id,
          title: image.title,
          status: "failed",
          error: error?.message || "Backfill failed",
        });
      }
    }
  }

  return new Response(
    JSON.stringify(
      {
        dryRun,
        refreshVariants,
        limit,
        scanned: images.length,
        migrated,
        failed,
        skipped,
        results,
      },
      null,
      2
    ),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
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
        ...mapImageForDisplay(image),
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

      const isDiscordSource = image.sourceType === "discord";
      const shouldRunDiscordAnalysis = isDiscordSource && image.aiStatus === "queued";
      const nextStatus = isDiscordSource ? "draft" : "active";
      await ctx.db.patch(args.imageId, {
        status: nextStatus,
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
        status: nextStatus,
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
      await scheduleStorageCleanup(ctx, image);
      await ctx.db.delete(args.imageId);
      return { ok: true, message: "Image rejected and deleted." };
    }

    if (image.status !== "active" && image.status !== "draft") {
      throw new Error("Image must be approved before generating variations.");
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
    userId: resolvedUserId,
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
      userId: resolvedUserId,
      imageId,
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
  "Commercial", "Film", "Moodboard",
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
      originalFileName: v.optional(v.string()),
      title: v.string(),
      description: v.optional(v.string()),
      tags: v.array(v.string()),
      category: v.string(),
      source: v.optional(v.string()),
      sref: v.optional(v.string()),
        colors: v.optional(v.array(v.string())),
        group: v.optional(v.string()),
        genre: v.optional(v.string()),
        style: v.optional(v.string()),
        shot: v.optional(v.string()),
        projectName: v.optional(v.string()),
      moodboardName: v.optional(v.string()),
      uniqueId: v.optional(v.string()),
      // Variation count for auto-generation right after smart analysis.
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
        const tempUrl = await ctx.storage.getUrl(upload.storageId);
        if (!tempUrl) {
          throw new Error("Failed to get temporary image URL");
        }
        const imageId = await ctx.db.insert("images", {
          title: upload.title,
          description: upload.description,
          // Temporary Convex URL while finalizeUploadedImage persists to Nextcloud.
          imageUrl: tempUrl,
          previewUrl: tempUrl,
          storageId: upload.storageId,
          tags: upload.tags,
          category: upload.category,
          source: upload.source,
          sref: upload.sref,
            colors: upload.colors ?? [],
            group: upload.group,
            genre: upload.genre,
            style: upload.style,
            shot: upload.shot,
            projectName: upload.projectName,
          moodboardName: upload.moodboardName,
          uniqueId: upload.uniqueId,
          uploadedBy: userId,
          likes: 0,
          views: 0,
          aiStatus: "processing",
          status: "draft",
          sourceType: "upload",
          storageProvider: "convex",
          nextcloudPersistStatus: "pending",
          storagePersistStatus: "pending",
          uploadedAt: Date.now(),
        });

        try {
          await ctx.scheduler.runAfter(0, internalApi.mediaStorage.finalizeUploadedImage, {
            storageId: upload.storageId,
            imageId: imageId,
            userId,
            group: upload.group,
            projectName: upload.projectName,
            moodboardName: upload.moodboardName,
            title: upload.title,
            description: upload.description,
            tags: upload.tags,
            category: upload.category,
            source: upload.source,
            sref: upload.sref || undefined,
            variationCount: upload.variationCount,
            sourceType: "upload",
          });
        } catch (err) {
          console.error("Failed to schedule Nextcloud finalize action:", err);
          await ctx.db.patch("images", imageId, { aiStatus: "failed" });
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

    const drafts = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) => q.eq(q.field("status"), "draft"))
      .order("desc")
      .collect();
    return drafts.map((img) => mapImageForDisplay(img));
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

    const allProcessing = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) => q.eq(q.field("aiStatus"), "processing"))
      .order("desc")
      .collect();

    // Hide very old "processing" items from the active queue.
    const staleCutoffMs = Date.now() - 18 * 60 * 60 * 1000;
    return allProcessing
      .filter((img) => (img.uploadedAt ?? 0) >= staleCutoffMs)
      .map((img) => mapImageForDisplay(img));
  },
});

export const clearMyStaleProcessingImages = mutation({
  args: {
    olderThanHours: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const olderThanMs = Math.max(1, args.olderThanHours ?? 18) * 60 * 60 * 1000;
    const cutoff = Date.now() - olderThanMs;

    const candidates = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) => q.eq(q.field("aiStatus"), "processing"))
      .collect();

    let updated = 0;
    for (const image of candidates) {
      if ((image.uploadedAt ?? 0) > cutoff) continue;
      await ctx.db.patch(image._id, { aiStatus: "failed" });
      updated += 1;
    }

    return updated;
  },
});

export const getPendingImages = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const pending = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .collect();

    return pending.map((image) => mapImageForDisplay(image));
  },
});

export const backfillGenerationsFromAiImages = mutation({
  args: {
    limit: v.optional(v.number()),
    imageIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const take = Math.min(Math.max(args.limit ?? 400, 1), 2000);
    const images = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .order("desc")
      .take(take);

    const generated = images.filter(
      (img) =>
        img.source === "AI Generation" ||
        (Array.isArray(img.tags) && img.tags.includes("generated"))
    );

    let inserted = 0;
    let skippedExisting = 0;

    for (const img of generated) {
      const existing = await ctx.db
        .query("generations")
        .withIndex("by_image", (q) => q.eq("imageId", img._id))
        .take(1);
      if (existing.length > 0) {
        skippedExisting += 1;
        continue;
      }

      await ctx.db.insert("generations", {
        imageId: img._id,
        type: "deck",
        templateId: "fal-image-generation",
        templateName: "FAL Image Generation",
        title: img.title || "Generated Image",
        description: img.description,
        content: JSON.stringify({
          imageId: img._id,
          imageUrl: img.imageUrl,
          previewUrl: img.previewUrl,
          sourceUrl: img.sourceUrl,
          parentImageId: img.parentImageId,
          sourceType: img.sourceType,
          nextcloudPersistStatus: img.nextcloudPersistStatus,
          createdAt: img.uploadedAt ?? img._creationTime,
        }),
        createdBy: userId,
        createdAt: img.uploadedAt ?? Date.now(),
      });
      inserted += 1;
    }

    return {
      scanned: generated.length,
      inserted,
      skippedExisting,
    };
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

    const isDiscordSource = image.sourceType === "discord";
    const shouldRunDiscordAnalysis = isDiscordSource && image.aiStatus === "queued";
    const nextStatus = isDiscordSource ? "draft" : "active";
    await ctx.db.patch("images", args.imageId, {
      status: nextStatus,
      aiStatus: shouldRunDiscordAnalysis ? "processing" : image.aiStatus,
    });

    if (!image.colors || image.colors.length === 0) {
      await ctx.scheduler.runAfter(
        0,
        (internalApi as any).colorExtraction.internalExtractAndStoreColors,
        {
          imageId: image._id,
          imageUrl:
            preferredImageUrlForSampling(image) ?? image.imageUrl,
        }
      );
    }

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
    await scheduleStorageCleanup(ctx, image);
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
    await scheduleStorageCleanup(ctx, image);

    // Delete the image record
    await ctx.db.delete("images", args.id);

    return { success: true };
  },
});

export const removeMany = mutation({
  args: { ids: v.array(v.id("images")) },
  returns: v.object({ removed: v.number() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let removed = 0;
    for (const id of args.ids) {
      const image = await ctx.db.get(id);
      if (!image || image.uploadedBy !== userId) continue;
      if (image.storageId) {
        await ctx.storage.delete(image.storageId);
      }
      await scheduleStorageCleanup(ctx, image);
      await ctx.db.delete("images", id);
      removed += 1;
    }

    return { removed };
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
    genre: v.optional(v.string()),
    style: v.optional(v.string()),
    shot: v.optional(v.string()),
    projectName: v.optional(v.string()),
    moodboardName: v.optional(v.string()),
    sref: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existingImage = await ctx.db.get("images", args.imageId);
    // NOTE: we intentionally do NOT write `colors` here. The VLM was
    // guessing plausible-looking hexes instead of sampling pixels, producing
    // inaccurate swatches. Colors are now owned exclusively by the
    // pixel-accurate server extractor in convex/colorExtraction.ts.
    void existingImage;
    const patch: any = {
      description: args.description,
    };
    const shouldSyncProjectName =
      existingImage?.sourceType === "upload" ||
      existingImage?.sourceType === "discord" ||
      existingImage?.sourceType === "pinterest";

    if (args.title) patch.title = args.title;
    if (args.tags) patch.tags = args.tags;
    if (args.category) patch.category = args.category;
    if (args.aiStatus) patch.aiStatus = args.aiStatus;
    if (args.group !== undefined) patch.group = args.group;
    if (args.genre !== undefined) patch.genre = args.genre;
    if (args.style !== undefined) patch.style = args.style;
    if (args.shot !== undefined) patch.shot = args.shot;
    if (args.projectName !== undefined) patch.projectName = args.projectName;
    else if (shouldSyncProjectName && args.title) patch.projectName = args.title;
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

export const internalApplyNextcloudUpload = internalMutation({
  args: {
    imageId: v.id("images"),
    imageUrl: v.string(),
    previewUrl: v.optional(v.string()),
    storageProvider: v.optional(
      v.union(v.literal("convex"), v.literal("nextcloud"), v.literal("rustfs"))
    ),
    storageBucket: v.optional(v.string()),
    storagePath: v.string(),
    previewStoragePath: v.optional(v.string()),
    derivativeUrls: v.optional(
      v.object({
        small: v.string(),
        medium: v.string(),
        large: v.string(),
      })
    ),
    derivativeStoragePaths: v.optional(
      v.object({
        small: v.string(),
        medium: v.string(),
        large: v.string(),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const previous = await ctx.db.get(args.imageId);
    const storageProvider = storageProviderFromPayload(args);
    await ctx.db.patch("images", args.imageId, {
      imageUrl: args.imageUrl,
      previewUrl: args.previewUrl,
      storageProvider,
      storageBucket: args.storageBucket,
      storagePath: args.storagePath,
      previewStoragePath: args.previewStoragePath,
      derivativeUrls: args.derivativeUrls,
      derivativeStoragePaths: args.derivativeStoragePaths,
      nextcloudPersistStatus: "succeeded",
      nextcloudPersistError: undefined,
      storagePersistStatus: "succeeded",
      storagePersistError: undefined,
      storageMigration: previous
        ? {
            fromProvider: previous.storageProvider,
            fromImageUrl: previous.imageUrl,
            fromPreviewUrl: previous.previewUrl,
            migratedAt: Date.now(),
          }
        : undefined,
      storageId: undefined,
    });
    return null;
  },
});

export const internalMarkNextcloudPersistFailed = internalMutation({
  args: {
    imageId: v.id("images"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("images", args.imageId, {
      nextcloudPersistStatus: "failed",
      nextcloudPersistError: args.error,
      storagePersistStatus: "failed",
      storagePersistError: args.error,
      storageProvider: "convex",
    });
    return null;
  },
});

export const internalRecordNextcloudBackfillFailure = internalMutation({
  args: {
    imageId: v.id("images"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("images", args.imageId, {
      nextcloudPersistStatus: "failed",
      nextcloudPersistError: args.error,
      storagePersistStatus: "failed",
      storagePersistError: args.error,
    });
    return null;
  },
});

export const internalListBackfillCandidates = internalQuery({
  args: {
    limit: v.optional(v.number()),
    imageIds: v.optional(v.array(v.string())),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 200, 1000));
    const selectedImages: any[] = [];
    for (const rawId of args.imageIds ?? []) {
      try {
        const image = await ctx.db.get(rawId as any);
        if (image) selectedImages.push(image);
      } catch {
        // Ignore malformed ids in operator-triggered backfills.
      }
    }
    const images =
      selectedImages.length > 0
        ? selectedImages.slice(0, limit)
        : await ctx.db.query("images").order("desc").take(limit);
    return images.map((image) => ({
      _id: image._id,
      title: image.title,
      status: image.status,
      imageUrl: image.imageUrl,
      previewUrl: image.previewUrl,
      derivativeUrls: image.derivativeUrls,
      sourceUrl: image.sourceUrl,
      sourceType: image.sourceType,
      storageProvider: image.storageProvider,
      storageBucket: image.storageBucket,
      storagePath: image.storagePath,
      previewStoragePath: image.previewStoragePath,
      derivativeStoragePaths: image.derivativeStoragePaths,
      nextcloudPersistStatus: image.nextcloudPersistStatus,
    }));
  },
});

export const internalGetMetadataRefreshPayload = internalQuery({
  args: {
    imageId: v.id("images"),
    userId: v.id("users"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image || image.uploadedBy !== args.userId) return null;
    return {
      _id: image._id,
      storageId: image.storageId,
      imageUrl: image.imageUrl,
      title: image.title,
      description: image.description,
      tags: image.tags,
      category: image.category,
      source: image.source,
      sref: image.sref,
      group: image.group,
      projectName: image.projectName,
      moodboardName: image.moodboardName,
      modificationMode: image.modificationMode,
      variationType: image.variationType,
      variationDetail: image.variationDetail,
      colors: image.colors,
    };
  },
});

export const backfillNextcloudFailedUploads = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.object({
    scheduled: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
    const images = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("sourceType"), "upload"),
          q.eq(q.field("storageProvider"), "convex"),
          q.neq(q.field("storageId"), undefined)
        )
      )
      .take(limit);

    let scheduled = 0;
    for (const image of images) {
      await ctx.scheduler.runAfter(0, internalApi.mediaStorage.finalizeUploadedImage, {
        storageId: image.storageId!,
        imageId: image._id,
        userId,
        group: image.group,
        projectName: image.projectName,
        moodboardName: image.moodboardName,
        title: image.title,
        description: image.description,
        tags: image.tags,
        category: image.category,
        source: image.source,
        sref: image.sref,
        variationCount: image.variationCount,
        sourceType: image.sourceType,
      });
      scheduled += 1;
    }

    return { scheduled };
  },
});

export const quarantineBrokenNextcloudImages = mutation({
  args: {
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    scanned: v.number(),
    quarantined: v.number(),
    dryRun: v.boolean(),
    results: v.array(
      v.object({
        imageId: v.id("images"),
        title: v.string(),
        status: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const limit = Math.max(1, Math.min(args.limit ?? 200, 1000));
    const dryRun = Boolean(args.dryRun);
    const images = await ctx.db
      .query("images")
      .withIndex("by_uploaded_by", (q) => q.eq("uploadedBy", userId))
      .order("desc")
      .take(limit);

    const brokenImages = images.filter(
      (image) =>
        (image.status === "active" || image.status === undefined) &&
        hasCollapsedNextcloudVariants(image)
    );

    if (!dryRun) {
      for (const image of brokenImages) {
        await ctx.db.patch(image._id, {
          status: "broken",
          nextcloudPersistError:
            image.nextcloudPersistError ||
            "Quarantined because derivative URLs collapsed to the original Nextcloud asset.",
        });
      }
    }

    return {
      scanned: images.length,
      quarantined: brokenImages.length,
      dryRun,
      results: brokenImages.slice(0, 100).map((image) => ({
        imageId: image._id,
        title: image.title,
        status: dryRun ? "would-quarantine" : "quarantined",
      })),
    };
  },
});

export const quarantineBrokenNextcloudHttp = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.INGEST_API_KEY;
  const token = readBearerToken(request);
  if (!apiKey || token !== apiKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(Number(body?.limit ?? 200), 1000));
  const dryRun = Boolean(body?.dryRun);
  const images = await ctx.runQuery((internal as any).images.internalListBackfillCandidates, {
    limit,
  });

  const brokenImages = images.filter(
    (image: any) =>
      (image.status === "active" || image.status === undefined) &&
      hasCollapsedNextcloudVariants(image)
  );

  if (!dryRun) {
    for (const image of brokenImages) {
      await ctx.runMutation((internal as any).images.internalQuarantineBrokenImage, {
        imageId: image._id,
      });
    }
  }

  return new Response(
    JSON.stringify({
      scanned: images.length,
      quarantined: brokenImages.length,
      dryRun,
      results: brokenImages.slice(0, 100).map((image: any) => ({
        imageId: image._id,
        title: image.title,
        status: dryRun ? "would-quarantine" : "quarantined",
      })),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});

export const internalQuarantineBrokenImage = internalMutation({
  args: {
    imageId: v.id("images"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) return null;

    await ctx.db.patch(args.imageId, {
      status: "broken",
      nextcloudPersistError:
        image.nextcloudPersistError ||
        "Quarantined because derivative URLs collapsed to the original Nextcloud asset.",
    });
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
    genre: v.optional(v.string()),
    style: v.optional(v.string()),
    shot: v.optional(v.string()),
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
    if (args.genre !== undefined) patch.genre = args.genre;
    if (args.style !== undefined) patch.style = args.style;
    if (args.shot !== undefined) patch.shot = args.shot;
    if (args.projectName !== undefined) patch.projectName = args.projectName;
    if (args.moodboardName !== undefined) patch.moodboardName = args.moodboardName;
    if (args.uniqueId !== undefined) patch.uniqueId = args.uniqueId;

    await ctx.db.patch("images", args.imageId, patch);

    return { success: true };
  },
});

/** Let the user mark an image's AI status (e.g. "completed" or "failed") to unstick stuck processing. */
export const setAiStatus = mutation({
  args: {
    imageId: v.id("images"),
    status: v.union(v.literal("completed"), v.literal("failed")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const image = await ctx.db.get("images", args.imageId);
    if (!image || image.uploadedBy !== userId) {
      throw new Error("Image not found or not yours");
    }
    await ctx.db.patch("images", args.imageId, { aiStatus: args.status });
    return null;
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
      sourceUrl: v.optional(v.string()),
      previewUrl: v.optional(v.string()),
      storagePath: v.optional(v.string()),
      storageProvider: v.optional(
        v.union(v.literal("convex"), v.literal("nextcloud"), v.literal("rustfs"))
      ),
      storageBucket: v.optional(v.string()),
      previewStoragePath: v.optional(v.string()),
      derivativeUrls: v.optional(
        v.object({
          small: v.string(),
          medium: v.string(),
          large: v.string(),
        })
      ),
      derivativeStoragePaths: v.optional(
        v.object({
          small: v.string(),
          medium: v.string(),
          large: v.string(),
        })
      ),
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
        previewUrl: img.previewUrl,
        storageProvider: storageProviderFromPayload({
          storageProvider: img.storageProvider,
          storageBucket: img.storageBucket,
          imageUrl: img.url,
          storagePath: img.storagePath,
        }),
        storageBucket: img.storageBucket,
        storagePath: img.storagePath,
        previewStoragePath: img.previewStoragePath,
        derivativeUrls: img.derivativeUrls,
        derivativeStoragePaths: img.derivativeStoragePaths,
        nextcloudPersistStatus: img.storagePath ? "succeeded" : "failed",
        storagePersistStatus: img.storagePath ? "succeeded" : "failed",
        // Inherit metadata from original (which might have been updated by analysis)
        category: originalImage.category,
        tags: [...originalImage.tags, "generated", "variation"],
        colors: [],
        uploadedBy: originalImage.uploadedBy,
        likes: 0,
        views: 0,
        source: "AI Generation",
        sourceType: inheritedSourceType,
        sourceUrl: img.sourceUrl || originalImage.sourceUrl || root?.sourceUrl,
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

      await ctx.scheduler.runAfter(
        0,
        (internalApi as any).colorExtraction.internalExtractAndStoreColors,
        {
          imageId: childImageId,
          imageUrl:
            preferredImageUrlForSampling({
              imageUrl: img.url,
              derivativeUrls: img.derivativeUrls,
            }) ?? img.url,
        }
      );

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
