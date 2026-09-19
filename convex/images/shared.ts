import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  isLikelyDirectImageUrl,
  normalizeImageSourceUrl,
} from "../colorExtractionUrls";
import {
  isNextcloudPublicUrl,
  isRustfsPublicUrl,
  NEXTCLOUD_PUBLIC_HOST,
  parseMediaUrlHost,
  RUSTFS_PUBLIC_HOST,
} from "../mediaAdapter";

type DbCtx = QueryCtx | MutationCtx;

/** Pre-split `internal.images.*` compatibility after V1S-84 nested modules. */
function attachImagesInternalShim(api: Record<string, unknown>) {
  const nested = api as Record<string, Record<string, unknown>>;
  api.images = {
    internalGetImageForAnalysis:
      nested["images/analysis"].internalGetImageForAnalysis,
    internalCanModifyImage: nested["images/analysis"].internalCanModifyImage,
    internalUpdateAnalysis: nested["images/analysis"].internalUpdateAnalysis,
    internalSetAiStatus: nested["images/analysis"].internalSetAiStatus,
    internalRefreshMetadataAfterPalette:
      nested["images/analysis"].internalRefreshMetadataAfterPalette,
    internalGetMetadataRefreshPayload:
      nested["images/analysis"].internalGetMetadataRefreshPayload,
    internalSaveGeneratedImages:
      nested["images/generation"].internalSaveGeneratedImages,
    internalGetGeneratedArtifactByKey:
      nested["images/generation"].internalGetGeneratedArtifactByKey,
    ingestExternal: nested["images/ingest"].ingestExternal,
    internalListDiscordQueue:
      nested["images/moderation"].internalListDiscordQueue,
    internalModerateDiscordImage:
      nested["images/moderation"].internalModerateDiscordImage,
    internalRepairImageMedia:
      nested["images/lifecycle"].internalRepairImageMedia,
    internalGetMediaRepairPayload:
      nested["images/lifecycle"].internalGetMediaRepairPayload,
    internalRecordNextcloudBackfillFailure:
      nested["images/lifecycle"].internalRecordNextcloudBackfillFailure,
    internalApplyNextcloudUpload:
      nested["images/lifecycle"].internalApplyNextcloudUpload,
    internalListBackfillCandidates:
      nested["images/lifecycle"].internalListBackfillCandidates,
    internalQuarantineBrokenImage:
      nested["images/lifecycle"].internalQuarantineBrokenImage,
  };
}

export const internalApi: any = internal as any;
attachImagesInternalShim(internalApi);

const MAX_DISCORD_LINEAGE_DEPTH = 12;
const MAX_SOURCE_LINEAGE_DEPTH = 12;
const CANONICAL_NEXTCLOUD_PUBLIC_TOKEN = "afc53c40a68aade";

export function triggerOrchestrationEnabled() {
  return process.env.PINDECK_TRIGGER_ORCHESTRATION_ENABLED === "true";
}

/**
 * Reject paths that contain traversal sequences or absolute path components.
 * Throws if the path is unsafe.
 */
export function assertSafeStoragePath(path: string, field: string): void {
  const segments = path.split(/[/\\]/);
  if (segments.some((s) => s === ".." || s === ".")) {
    throw new Error(`Invalid ${field}: path traversal not allowed`);
  }
  if (path.startsWith("/") || path.startsWith("\\")) {
    throw new Error(`Invalid ${field}: absolute paths not allowed`);
  }
}

export function collectNextcloudPaths(image: Partial<Doc<"images">>): string[] {
  return [
    image?.storagePath,
    image?.previewStoragePath,
    image?.derivativeStoragePaths?.small,
    image?.derivativeStoragePaths?.medium,
    image?.derivativeStoragePaths?.large,
  ].filter(
    (path): path is string =>
      typeof path === "string" && path.trim().length > 0,
  );
}

export function storageProviderFromPayload(args: {
  storageProvider?: "convex" | "nextcloud" | "rustfs";
  storageBucket?: string;
  imageUrl?: string;
  storagePath?: string;
}) {
  if (args.storageProvider) return args.storageProvider;
  if (args.storageBucket || parseUrlHost(args.imageUrl) === RUSTFS_PUBLIC_HOST)
    return "rustfs";
  if (args.storagePath) return "nextcloud";
  return undefined;
}

export async function scheduleStorageCleanup(
  ctx: MutationCtx,
  image: Doc<"images">,
) {
  const paths = collectNextcloudPaths(image);
  if (paths.length === 0) return;
  if (image.storageProvider === "rustfs" || image.storageBucket) {
    try {
      await ctx.scheduler.runAfter(
        0,
        internal.mediaStorage.cleanupRustfsObjects,
        {
          bucket: image.storageBucket || "pindeck",
          paths,
        },
      );
    } catch (error) {
      console.warn("Failed to schedule RustFS cleanup", error);
    }
    return;
  }
  try {
    await ctx.scheduler.runAfter(0, internal.mediaStorage.cleanupNextcloudPaths, {
      paths,
    });
  } catch (error) {
    console.warn("Failed to schedule Nextcloud cleanup", error);
  }
}

export async function cleanupImageReferences(
  ctx: MutationCtx,
  image: Doc<"images">,
) {
  const userId = image.uploadedBy;

  const boards = await ctx.db
    .query("collections")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const board of boards) {
    if (!board.imageIds.some((id) => id === image._id)) continue;
    await ctx.db.patch(board._id, {
      imageIds: board.imageIds.filter((id) => id !== image._id),
    });
  }

  const decks = await ctx.db
    .query("decks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const deck of decks) {
    const sourceImageIds = deck.sourceImageIds.filter(
      (id) => id !== image._id,
    );
    const slides = deck.slides
      .filter((slide) => slide.imageId !== image._id)
      .map((slide, index) => ({ ...slide, order: index + 1 }));
    if (
      sourceImageIds.length === deck.sourceImageIds.length &&
      slides.length === deck.slides.length
    ) {
      continue;
    }
    await ctx.db.patch(deck._id, {
      sourceImageIds,
      slides,
      updatedAt: Date.now(),
    });
  }

  const likes = await ctx.db
    .query("likes")
    .withIndex("by_image", (q) => q.eq("imageId", image._id))
    .collect();
  for (const like of likes) {
    await ctx.db.delete(like._id);
  }

  const generations = await ctx.db
    .query("generations")
    .withIndex("by_image", (q) => q.eq("imageId", image._id))
    .collect();
  for (const generation of generations) {
    await ctx.db.delete(generation._id);
  }
}

export async function deleteImageRecord(
  ctx: MutationCtx,
  image: Doc<"images">,
) {
  const generatedChild = await ctx.db
    .query("images")
    .withIndex("by_parent", (q) => q.eq("parentImageId", image._id))
    .first();
  if (generatedChild) {
    throw new Error(
      "This image has generated variations. Delete its variations before deleting the source image.",
    );
  }

  await cleanupImageReferences(ctx, image);

  if (image.storageId) {
    try {
      await ctx.storage.delete(image.storageId);
    } catch (error) {
      console.warn("Convex storage delete failed; deleting image row anyway", {
        imageId: image._id,
        error,
      });
    }
  }

  await scheduleStorageCleanup(ctx, image);
  await ctx.db.delete("images", image._id);
}

export function readBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
}

export function parseUserIdFromBody(body: unknown) {
  if (!body || typeof body !== "object" || !("userId" in body)) {
    return undefined;
  }
  const userId = (body as { userId?: unknown }).userId;
  return typeof userId === "string" && userId.trim()
    ? userId.trim()
    : undefined;
}

export function normalizeExternalImageUrl(rawUrl: unknown): string {
  const value = String(rawUrl ?? "").trim();
  if (!value) return "";
  if (value.startsWith("<") && value.endsWith(">")) {
    return value.slice(1, -1).trim();
  }
  return value.replace(/[>\]),.;!?]+$/g, "").trim();
}

export function parseUrlHost(rawUrl: unknown): string | undefined {
  return parseMediaUrlHost(rawUrl);
}

export function isCloudHostedUrl(rawUrl: unknown): boolean {
  return isNextcloudPublicUrl(rawUrl);
}

export function isCanonicalCloudUrl(rawUrl: unknown): boolean {
  try {
    const parsed = new URL(String(rawUrl ?? ""));
    return (
      parsed.host.toLowerCase() === NEXTCLOUD_PUBLIC_HOST &&
      parsed.pathname.startsWith(
        `/public.php/dav/files/${CANONICAL_NEXTCLOUD_PUBLIC_TOKEN}/`,
      )
    );
  } catch {
    return false;
  }
}

export function isRustfsUrl(rawUrl: unknown): boolean {
  return isRustfsPublicUrl(rawUrl);
}

export function looksLikeHttpUrl(rawUrl: unknown): rawUrl is string {
  const value = String(rawUrl ?? "").trim();
  return value.startsWith("http://") || value.startsWith("https://");
}

export function pickBackfillSourceUrl(
  image: Partial<Doc<"images">>,
): string | undefined {
  const candidates = [image.imageUrl, image.previewUrl, image.sourceUrl];
  for (const candidate of candidates) {
    if (!looksLikeHttpUrl(candidate)) continue;
    return candidate;
  }
  return undefined;
}

export function pickMediaRepairSourceUrl(
  image: Partial<Doc<"images">>,
): string | undefined {
  return pickMediaRepairSourceUrls(image)[0];
}

export function pickMediaRepairSourceUrls(image: Partial<Doc<"images">>): string[] {
  const externalCandidates = [image.sourceUrl]
    .map(normalizeImageSourceUrl)
    .filter((candidate) => isLikelyDirectImageUrl(candidate));
  const durableCandidates = [
    image.derivativeUrls?.large,
    image.derivativeUrls?.medium,
    image.previewUrl,
    image.imageUrl,
    image.derivativeUrls?.small,
  ]
    .map(normalizeImageSourceUrl)
    .filter(looksLikeHttpUrl);
  return [...new Set([...externalCandidates, ...durableCandidates])];
}

export function hasCollapsedNextcloudVariants(
  image: Partial<Doc<"images">>,
): boolean {
  if (!image.storagePath || image.storageProvider !== "nextcloud") {
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

export function mapImageForDisplay<T>(image: T): T {
  return image;
}

export function isModeratedImportSource(sourceType?: string) {
  return sourceType === "discord" || sourceType === "pinterest";
}

export function shouldQueueAnalysis(image: {
  sourceType?: string;
  aiStatus?: string;
}) {
  return (
    isModeratedImportSource(image.sourceType) && image.aiStatus === "queued"
  );
}

export async function resolveLineageRoot(
  ctx: DbCtx,
  image: Doc<"images">,
): Promise<Doc<"images">> {
  let current = image;
  let depth = 0;

  while (current.parentImageId && depth < MAX_DISCORD_LINEAGE_DEPTH) {
    const parent = await ctx.db.get("images", current.parentImageId);
    if (!parent) break;
    current = parent;
    depth += 1;
  }

  return current;
}

export async function isDiscordLineage(
  ctx: DbCtx,
  image: Doc<"images">,
): Promise<boolean> {
  let current: Doc<"images"> | null = image;
  let depth = 0;

  while (current && depth < MAX_DISCORD_LINEAGE_DEPTH) {
    if (current.sourceType === "discord") return true;
    if (!current.parentImageId) return false;
    current = await ctx.db.get("images", current.parentImageId);
    depth += 1;
  }

  return false;
}

export async function resolveModeratedLineageSource(
  ctx: DbCtx,
  image: Doc<"images">,
): Promise<Doc<"images">["sourceType"]> {
  let current: Doc<"images"> | null = image;
  let depth = 0;

  while (current && depth < MAX_SOURCE_LINEAGE_DEPTH) {
    if (isModeratedImportSource(current.sourceType)) return current.sourceType;
    if (!current.parentImageId) return undefined;
    current = await ctx.db.get("images", current.parentImageId);
    depth += 1;
  }

  return undefined;
}
