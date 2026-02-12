import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const postStatus = internalAction({
  args: {
    event: v.union(v.literal("queued"), v.literal("approved"), v.literal("rejected")),
    imageId: v.id("images"),
    title: v.string(),
    sref: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const webhookUrl = process.env.DISCORD_STATUS_WEBHOOK_URL;
    if (!webhookUrl) return null;

    const emojiByEvent: Record<"queued" | "approved" | "rejected", string> = {
      queued: "📥",
      approved: "✅",
      rejected: "🗑️",
    };

    const labelByEvent: Record<"queued" | "approved" | "rejected", string> = {
      queued: "Waiting Approval",
      approved: "Approved",
      rejected: "Rejected",
    };

    const lines = [
      `${emojiByEvent[args.event]} **${labelByEvent[args.event]}**`,
      `Title: ${args.title}`,
      `Image ID: ${args.imageId}`,
      args.sref ? `sref: ${args.sref}` : null,
      args.sourceUrl ? `Source: ${args.sourceUrl}` : null,
      args.userId ? `User: ${args.userId}` : null,
    ].filter(Boolean);

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: lines.join("\n") }),
      });
    } catch (error) {
      console.warn("Failed to post Discord status webhook", error);
    }

    return null;
  },
});
