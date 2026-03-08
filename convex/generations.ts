import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const templates = {
  storyboard: {
    id: "storyboard-standard",
    name: "Storyboard Standard",
    content:
      "Template: 6-frame storyboard with beats for opening, conflict, pivot, climax, and resolution.",
  },
  deck: {
    id: "deck-pitch",
    name: "Pitch Deck",
    content:
      "Template: title, logline, tone references, visual palette, and key frame selection.",
  },
};

export const generate = mutation({
  args: {
    imageId: v.id("images"),
    type: v.union(v.literal("storyboard"), v.literal("deck")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to generate outputs");
    }

    const image = await ctx.db.get("images", args.imageId);
    if (!image) {
      throw new Error("Image not found");
    }

    const template = templates[args.type];
    const title = `${template.name}: ${image.title}`;
    const description = `Generated from ${image.title} using the ${template.name} template.`;

    const generationId = await ctx.db.insert("generations", {
      imageId: args.imageId,
      type: args.type,
      templateId: template.id,
      templateName: template.name,
      title,
      description,
      content: template.content,
      createdBy: userId,
      createdAt: Date.now(),
    });

    return {
      id: generationId,
      type: args.type,
      templateName: template.name,
      title,
    };
  },
});

export const backfillFromGeneratedImages = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const take = Math.min(Math.max(args.limit ?? 200, 1), 2000);
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
