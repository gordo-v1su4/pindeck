import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const internalSetColors = internalMutation({
  args: {
    imageId: v.id("images"),
    colors: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("images", args.imageId, { colors: args.colors });
    return null;
  },
});
