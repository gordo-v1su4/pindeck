import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mapImageForDisplay } from "./shared";

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
        q.eq(q.field("status"), undefined),
      );

    if (args.group && args.category) {
      images = await ctx.db
        .query("images")
        .withIndex("by_group", (q) => q.eq("group", args.group))
        .filter((q) =>
          q.and(statusFilter(q), q.eq(q.field("category"), args.category)),
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
              q.eq("userId", userId).eq("imageId", image._id),
            )
            .unique();
          isLiked = !!like;
        }

        return mapImageForDisplay({
          ...image,
          isLiked,
        });
      }),
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
      (img) => img.status === "active" || img.status === undefined,
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
        q.eq(q.field("status"), undefined),
      );

    let images;
    if (args.category && args.group) {
      const category = args.category;
      const group = args.group;
      images = await ctx.db
        .query("images")
        .withSearchIndex("search_content", (q) =>
          q
            .search("title", args.searchTerm)
            .eq("category", category)
            .eq("group", group),
        )
        .filter(statusFilter)
        .take(50);
    } else if (args.category) {
      const category = args.category;
      images = await ctx.db
        .query("images")
        .withSearchIndex("search_content", (q) =>
          q.search("title", args.searchTerm).eq("category", category),
        )
        .filter(statusFilter)
        .take(50);
    } else if (args.group) {
      const group = args.group;
      images = await ctx.db
        .query("images")
        .withSearchIndex("search_content", (q) =>
          q.search("title", args.searchTerm).eq("group", group),
        )
        .filter(statusFilter)
        .take(50);
    } else {
      images = await ctx.db
        .query("images")
        .withSearchIndex("search_content", (q) =>
          q.search("title", args.searchTerm),
        )
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
              q.eq("userId", userId).eq("imageId", image._id),
            )
            .unique();
          isLiked = !!like;
        }

        return mapImageForDisplay({
          ...image,
          isLiked,
        });
      }),
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
          q.eq("userId", userId).eq("imageId", image._id),
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
        q.eq("userId", userId).eq("imageId", args.imageId),
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
  "Commercial",
  "Editorial",
  "Film",
  "Moodboard",
  "Music Video",
  "TV Series",
  "Web Series",
  "Video Game Cinematic",
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
    const existingCategories = new Set(images.map((img) => img.category));

    const defaultCategories = [
      "Abstract",
      "Architecture",
      "Art",
      "Blockbuster Film",
      "Character Design",
      "Cinematic",
      "Commercial",
      "Design",
      "Environment",
      "Fashion",
      "Film",
      "Gaming",
      "Headshot",
      "Indy Film",
      "Illustration",
      "Interior",
      "Landscape",
      "Photography",
      "Sci-Fi",
      "Streetwear",
      "Technology",
      "Texture",
      "UI/UX",
      "Vintage",
    ];

    const allCategories = new Set([
      ...defaultCategories,
      ...existingCategories,
    ]);
    return [...allCategories].sort();
  },
});

export const getLineage = query({
  args: { imageId: v.id("images") },
  returns: v.object({
    parent: v.union(v.null(), v.any()),
    children: v.array(v.any()),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { parent: null, children: [] };
    }

    const image = await ctx.db.get("images", args.imageId);
    const isActiveLibraryImage = (row: { status?: string }) =>
      row.status === "active" || row.status === undefined;
    if (!image) {
      return { parent: null, children: [] };
    }

    const canViewLineage =
      image.uploadedBy === userId || isActiveLibraryImage(image);
    if (!canViewLineage) {
      return { parent: null, children: [] };
    }

    const parent = image.parentImageId
      ? await ctx.db.get("images", image.parentImageId)
      : null;
    const children = await ctx.db
      .query("images")
      .withIndex("by_parent", (q) => q.eq("parentImageId", args.imageId))
      .collect();

    const visible = (row: typeof image | null) =>
      row && (row.uploadedBy === userId || isActiveLibraryImage(row));

    return {
      parent: visible(parent) ? parent : null,
      children: children.filter((child) => visible(child)),
    };
  },
});

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
