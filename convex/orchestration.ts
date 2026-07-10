import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const imageRefreshHttp = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const configuredToken = process.env.PINDECK_ORCHESTRATION_TOKEN?.trim();
  const authorization = request.headers.get("authorization");
  const suppliedToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined;
  if (!configuredToken || suppliedToken !== configuredToken) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = await request.json().catch(() => null) as {
    imageId?: string;
    userId?: string;
    forcePalette?: boolean;
    runMetadata?: boolean;
  } | null;
  if (!body?.imageId || !body.userId) {
    return json({ error: "imageId and userId are required" }, 400);
  }

  const image = await ctx.runQuery((internal as any).images.internalGetMetadataRefreshPayload, {
    imageId: body.imageId,
    userId: body.userId,
  });
  if (!image?.imageUrl) {
    return json({ error: "Image not found, not owned by user, or missing a durable URL" }, 404);
  }

  const result = await ctx.runAction((internal as any).images.internalRefreshMetadataAfterPalette, {
    imageId: body.imageId,
    userId: body.userId,
    paletteUrl: image.imageUrl,
    forcePalette: body.forcePalette,
    runMetadata: body.runMetadata,
  });
  return json({ ok: true, ...result });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
