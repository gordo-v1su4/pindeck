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
