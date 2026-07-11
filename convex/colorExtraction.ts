"use node";

// Server-side: sharp → RGB buffer → shared dominance-first palette (see src/lib/colorPaletteCore.ts).

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

function mediaGatewayConfig(): { url: string; token: string } | null {
  const url = process.env.MEDIA_GATEWAY_URL || process.env.RUSTFS_MEDIA_API_URL;
  const token = process.env.MEDIA_GATEWAY_TOKEN || process.env.MEDIA_API_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

async function extractColorsViaMediaGateway(imageUrl: string): Promise<string[]> {
  const config = mediaGatewayConfig();
  if (!config) return [];

  const response = await fetch(`${config.url}/palette`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageUrl }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.warn("[colorExtraction] media gateway palette failed", response.status, body.slice(0, 200));
    return [];
  }

  const parsed = (await response.json().catch(() => null)) as { colors?: unknown } | null;
  if (!Array.isArray(parsed?.colors)) return [];
  return parsed.colors
    .filter((color): color is string => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color))
    .slice(0, 5);
}

/**
 * Extract colors for a single image and patch the row.
 * Safe to call any number of times — always overwrites with latest sample.
 */
export const internalExtractAndStoreColors = internalAction({
  args: {
    imageId: v.id("images"),
    imageUrl: v.string(),
  },
  returns: v.object({ ok: v.boolean(), colors: v.array(v.string()) }),
  handler: async (ctx, args) => {
    const url = args.imageUrl;
    if (!url) return { ok: false, colors: [] };

    const colors = await extractColorsViaMediaGateway(url);
    if (colors.length === 0) return { ok: false, colors: [] };

    await ctx.runMutation(
      (internal as any).colorExtractionWrite.internalSetColors,
      { imageId: args.imageId, colors }
    );
    return { ok: true, colors };
  },
});
