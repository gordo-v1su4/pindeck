import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { preferredImageUrlForSampling } from "./colorExtractionUrls";

/**
 * Public mutation to backfill all images (or only ones missing colors).
 * Schedules an individual internal action per image so long runs don't block.
 */
export const reExtractAll = mutation({
  args: {
    onlyMissing: v.optional(v.boolean()),
    imageIds: v.optional(v.array(v.id("images"))),
  },
  returns: v.object({ scheduled: v.number() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Sign in to refresh image palettes.");
    }

    const all = args.imageIds
      ? (await Promise.all(args.imageIds.map((id) => ctx.db.get(id)))).filter(
          (img): img is NonNullable<typeof img> => Boolean(img)
        )
      : await ctx.db.query("images").collect();
    let scheduled = 0;
    for (const img of all) {
      if (img.uploadedBy !== userId) continue;
      if (args.onlyMissing && img.colors && img.colors.length > 0) continue;
      const url = preferredImageUrlForSampling(img);
      if (!url) continue;
      await ctx.scheduler.runAfter(
        0,
        (internal as any).colorExtraction.internalExtractAndStoreColors,
        { imageId: img._id, imageUrl: url }
      );
      scheduled += 1;
    }
    return { scheduled };
  },
});

/**
 * Public mutation to re-sample colors for a single image.
 */
export const reExtractForImage = mutation({
  args: { imageId: v.id("images") },
  returns: v.object({ scheduled: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Sign in to refresh image palette.");
    }

    const img = await ctx.db.get("images", args.imageId);
    if (!img) return { scheduled: false };
    const url = preferredImageUrlForSampling(img);
    if (!url) return { scheduled: false };
    await ctx.scheduler.runAfter(
      0,
      (internal as any).colorExtraction.internalExtractAndStoreColors,
      { imageId: args.imageId, imageUrl: url }
    );
    return { scheduled: true };
  },
});
