import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const postStatus = internalAction({
  args: {
    event: v.union(
      v.literal("queued"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("generation_started"),
      v.literal("generated")
    ),
    imageId: v.id("images"),
    title: v.string(),
    sref: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    imageUrl: v.optional(v.string()),
    parentImageId: v.optional(v.id("images")),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const webhookUrl = process.env.DISCORD_STATUS_WEBHOOK_URL;
    if (!webhookUrl) return null;

    const emojiByEvent: Record<
      "queued" | "approved" | "rejected" | "generation_started" | "generated",
      string
    > = {
      queued: "📥",
      approved: "✅",
      rejected: "🗑️",
      generation_started: "🎬",
      generated: "🪄",
    };

    const labelByEvent: Record<
      "queued" | "approved" | "rejected" | "generation_started" | "generated",
      string
    > = {
      queued: "Waiting Approval",
      approved: "Approved",
      rejected: "Rejected",
      generation_started: "Generating Variations",
      generated: "Variation Queued",
    };

    const lines = [
      `${emojiByEvent[args.event]} **${labelByEvent[args.event]}**`,
      `Title: ${args.title}`,
      `Image ID: ${args.imageId}`,
      args.parentImageId ? `Parent Image ID: ${args.parentImageId}` : null,
      args.sref ? `sref: ${args.sref}` : null,
      args.sourceUrl ? `Source: ${args.sourceUrl}` : null,
      args.userId ? `User: ${args.userId}` : null,
      args.event === "queued" || args.event === "generated"
        ? `Moderate: \`/images approve image_id:${args.imageId}\` or \`/images reject image_id:${args.imageId}\``
        : null,
    ].filter(Boolean);

    try {
      const payload: Record<string, unknown> = {
        content: lines.join("\n"),
        allowed_mentions: { parse: [] },
      };
      if (args.imageUrl) {
        payload.embeds = [
          {
            title: args.title.slice(0, 256),
            image: { url: args.imageUrl },
            footer: { text: `Image ID: ${args.imageId}` },
          },
        ];
      }

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn("Failed to post Discord status webhook", error);
    }

    return null;
  },
});
