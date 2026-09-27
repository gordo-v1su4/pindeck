"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalApi } from "./images/shared";
import { preferredImageUrlForSampling } from "./colorExtractionUrls";
import {
  normalizeStoragePath as normalizePath,
  toKebabCase,
  trimTrailingSlash,
} from "./lib/mediaAdapter";

type MediaGatewayConfig = {
  url: string;
  token: string;
  userId: string;
  bucket: string;
  uploadPrefix: string;
};

type UploadedImage = {
  bucket?: string;
  imageUrl: string;
  previewUrl: string;
  storagePath: string;
  previewStoragePath: string;
  colors?: string[];
  derivativeUrls?: {
    small: string;
    medium: string;
    large: string;
  };
  derivativeStoragePaths?: {
    small: string;
    medium: string;
    large: string;
  };
};


function getMediaGatewayConfig(): MediaGatewayConfig | null {
  const url = process.env.MEDIA_GATEWAY_URL || process.env.RUSTFS_MEDIA_API_URL;
  const token = process.env.MEDIA_GATEWAY_TOKEN || process.env.MEDIA_API_TOKEN;
  const userId =
    process.env.MEDIA_GATEWAY_USER_ID ||
    process.env.PINDECK_MEDIA_USER_ID ||
    "pindeck";
  const bucket = process.env.MEDIA_GATEWAY_BUCKET || "pindeck";
  const configuredPrefix =
    process.env.MEDIA_GATEWAY_UPLOAD_PREFIX ||
    "media-uploads";
  const normalizedPrefix = normalizePath(configuredPrefix);
  const uploadPrefix =
    bucket === "pindeck" && normalizedPrefix.startsWith("pindeck/")
      ? normalizedPrefix.slice("pindeck/".length)
      : normalizedPrefix;

  if (!url || !token) {
    return null;
  }

  return {
    url: trimTrailingSlash(url),
    token,
    userId,
    bucket,
    uploadPrefix: uploadPrefix || "media-uploads",
  };
}

function readBodyTextSafe(response: Response): Promise<string> {
  return response.text().catch(() => "");
}

function toBinaryBody(data: Buffer): ArrayBuffer {
  const bytes = Uint8Array.from(data);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

function fileNameFromPath(path: string): string {
  return normalizePath(path).split("/").pop() || "file";
}

function folderFromPath(path: string): string {
  const parts = normalizePath(path).split("/");
  parts.pop();
  return parts.join("/");
}

async function processImageViaMediaGateway(args: {
  gateway: MediaGatewayConfig;
  directory: string;
  fileBase: string;
  originalExt: string;
  title?: string;
  contentType: string;
  data: Buffer;
}): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("userId", args.gateway.userId);
  formData.append("folder", args.directory);
  formData.append("basename", args.fileBase);
  formData.append("originalExt", args.originalExt);
  formData.append("bucket", args.gateway.bucket);
  if (args.title) {
    formData.append("title", args.title);
  }
  formData.append(
    "file",
    new Blob([toBinaryBody(args.data)], {
      type: args.contentType || "application/octet-stream",
    }),
    `${args.fileBase}.${args.originalExt}`
  );

  const response = await fetch(`${args.gateway.url}/process-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.gateway.token}`,
    },
    body: formData,
  });

  const body = await readBodyTextSafe(response);
  if (!response.ok) {
    throw new Error(
      `Media gateway process-image failed (${response.status}) for ${args.fileBase}: ${body.slice(0, 300)}`
    );
  }

  const parsed = JSON.parse(body) as UploadedImage;
  if (
    !parsed?.imageUrl ||
    !parsed?.previewUrl ||
    !parsed?.storagePath ||
    !parsed?.previewStoragePath ||
    !parsed?.derivativeUrls?.small ||
    !parsed?.derivativeUrls?.medium ||
    !parsed?.derivativeUrls?.large ||
    !parsed?.derivativeStoragePaths?.small ||
    !parsed?.derivativeStoragePaths?.medium ||
    !parsed?.derivativeStoragePaths?.large
  ) {
    throw new Error(`Media gateway process-image returned incomplete payload for ${args.fileBase}`);
  }

  return {
    bucket: parsed.bucket || args.gateway.bucket,
    imageUrl: parsed.imageUrl,
    previewUrl: parsed.previewUrl,
    storagePath: normalizePath(parsed.storagePath),
    previewStoragePath: normalizePath(parsed.previewStoragePath),
    colors: parsed.colors?.slice(0, 5),
    derivativeUrls: parsed.derivativeUrls,
    derivativeStoragePaths: {
      small: normalizePath(parsed.derivativeStoragePaths.small),
      medium: normalizePath(parsed.derivativeStoragePaths.medium),
      large: normalizePath(parsed.derivativeStoragePaths.large),
    },
  };
}

function extensionFromInput(fileName: string | undefined, contentType: string | undefined): string {
  if (fileName) {
    const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
    if (match?.[1]) {
      const ext = match[1];
      if (ext === "jpeg") return "jpg";
      return ext;
    }
  }

  const mime = (contentType || "").toLowerCase();
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("avif")) return "avif";
  return "jpg";
}

function fileNameFromUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : undefined;
  } catch {
    return undefined;
  }
}

const uploadedImageReturnValidator = v.object({
  bucket: v.optional(v.string()),
  imageUrl: v.string(),
  previewUrl: v.string(),
  storagePath: v.string(),
  previewStoragePath: v.string(),
  colors: v.optional(v.array(v.string())),
  derivativeUrls: v.optional(
    v.object({
      small: v.string(),
      medium: v.string(),
      large: v.string(),
    })
  ),
  derivativeStoragePaths: v.optional(
    v.object({
      small: v.string(),
      medium: v.string(),
      large: v.string(),
    })
  ),
});

async function persistImageBuffer(args: {
  fileBuffer: Buffer;
  originalFileName?: string;
  contentType?: string;
  title?: string;
}): Promise<UploadedImage> {
  const mediaGateway = getMediaGatewayConfig();
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const monthDay = `${month}_${day}`;

  const originalExt = extensionFromInput(args.originalFileName, args.contentType);
  const baseName = toKebabCase(args.title || args.originalFileName || "image");
  const nonce = Math.random().toString(36).slice(2, 8);
  const fileBase = `${baseName}-${Date.now().toString(36)}-${nonce}`;

  if (!mediaGateway) {
    throw new Error(
      "Missing RustFS media gateway env. Required: MEDIA_GATEWAY_URL/RUSTFS_MEDIA_API_URL and MEDIA_GATEWAY_TOKEN/MEDIA_API_TOKEN"
    );
  }

  const directory = normalizePath(`${mediaGateway.uploadPrefix}/${year}/${monthDay}`);
  return await processImageViaMediaGateway({
    gateway: mediaGateway,
    directory,
    fileBase,
    originalExt,
    title: args.title,
    contentType: args.contentType || "application/octet-stream",
    data: args.fileBuffer,
  });
}

async function fetchImageAsBuffer(sourceUrl: string): Promise<{
  data: Buffer;
  contentType: string;
  fileName?: string;
}> {
  const response = await fetch(sourceUrl, {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    const body = await readBodyTextSafe(response);
    throw new Error(`Failed to fetch source image (${response.status}): ${body.slice(0, 300)}`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const data = Buffer.from(await response.arrayBuffer());
  const fileName = fileNameFromUrl(sourceUrl);

  return { data, contentType, fileName };
}

export const persistExternalImageFromUrl = internalAction({
  args: {
    sourceUrl: v.string(),
    title: v.optional(v.string()),
  },
  returns: uploadedImageReturnValidator,
  handler: async (_ctx, args) => {
    const source = await fetchImageAsBuffer(args.sourceUrl);
    return await persistImageBuffer({
      fileBuffer: source.data,
      contentType: source.contentType,
      originalFileName: source.fileName,
      title: args.title,
    });
  },
});

export const persistGeneratedImageFromUrl = internalAction({
  args: {
    sourceUrl: v.string(),
    title: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      bucket: v.optional(v.string()),
      imageUrl: v.string(),
      previewUrl: v.string(),
      storagePath: v.string(),
      previewStoragePath: v.string(),
      colors: v.optional(v.array(v.string())),
      derivativeUrls: v.optional(
        v.object({
          small: v.string(),
          medium: v.string(),
          large: v.string(),
        })
      ),
      derivativeStoragePaths: v.optional(
        v.object({
          small: v.string(),
          medium: v.string(),
          large: v.string(),
        })
      ),
    }),
    v.object({
      ok: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (_ctx, args) => {
    try {
      const source = await fetchImageAsBuffer(args.sourceUrl);
      const uploaded = await persistImageBuffer({
        fileBuffer: source.data,
        contentType: source.contentType,
        originalFileName: source.fileName,
        title: args.title,
      });
      return {
        ok: true,
        ...uploaded,
      } as const;
    } catch (error: any) {
      const msg = error?.message || "Failed to persist generated image";
      const isRustfsUnconfigured = /Missing RustFS media gateway env/i.test(msg);
      return {
        ok: false,
        error: isRustfsUnconfigured ? "RustFS media gateway not configured" : msg,
      } as const;
    }
  },
});

export const finalizeUploadedImage = internalAction({
  args: {
    imageId: v.id("images"),
    userId: v.id("users"),
    storageId: v.id("_storage"),
    title: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    category: v.string(),
    source: v.optional(v.string()),
    sref: v.optional(v.string()),
    group: v.optional(v.string()),
    projectName: v.optional(v.string()),
    moodboardName: v.optional(v.string()),
    variationCount: v.optional(v.number()),
    scheduleAnalysis: v.optional(v.boolean()),
    sourceType: v.optional(
      v.union(
        v.literal("upload"),
        v.literal("discord"),
        v.literal("pinterest"),
        v.literal("ai")
      )
    ),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), imageUrl: v.string() }),
    v.object({ ok: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    try {
      const sourceUrl = await ctx.storage.getUrl(args.storageId);
      if (!sourceUrl) {
        throw new Error("Could not resolve temporary Convex storage URL");
      }

      const source = await fetchImageAsBuffer(sourceUrl);
      const uploaded = await persistImageBuffer({
        fileBuffer: source.data,
        contentType: source.contentType,
        originalFileName: source.fileName,
        title: args.title,
      });

      await ctx.runMutation(internalApi.images.internalApplyStorageUpload, {
        imageId: args.imageId,
        imageUrl: uploaded.imageUrl,
        previewUrl: uploaded.previewUrl,
        storageProvider: uploaded.bucket ? "rustfs" : undefined,
        storageBucket: uploaded.bucket,
        storagePath: uploaded.storagePath,
        previewStoragePath: uploaded.previewStoragePath,
        colors: uploaded.colors,
        derivativeUrls: uploaded.derivativeUrls,
        derivativeStoragePaths: uploaded.derivativeStoragePaths,
      });

      try {
        await ctx.storage.delete(args.storageId);
      } catch (storageDeleteError) {
        console.warn("Failed to delete temporary Convex storage file", storageDeleteError);
      }

      if (args.scheduleAnalysis !== false) {
        // Pixel-accurate color sampling runs in parallel with VLM analysis on
        // the legacy Convex path. Trigger callbacks run the same steps inline.
        await ctx.scheduler.runAfter(
          0,
          (internal as any).colorExtraction.internalExtractAndStoreColors,
          {
            imageId: args.imageId,
            imageUrl: preferredImageUrlForSampling(uploaded) ?? uploaded.imageUrl,
          }
        );

        await ctx.scheduler.runAfter(0, (internal as any).vision.internalSmartAnalyzeImage, {
          imageId: args.imageId,
          userId: args.userId,
          imageUrl: uploaded.imageUrl,
          title: args.title,
          description: args.description,
          tags: args.tags,
          category: args.category,
          source: args.source,
          sref: args.sref,
          group: args.group,
          projectName: args.projectName,
          moodboardName: args.moodboardName,
          variationCount: Math.max(0, Math.min(args.variationCount ?? 2, 12)),
        });
      }

      return { ok: true, imageUrl: uploaded.imageUrl } as const;
    } catch (error: any) {
      console.error("Failed to finalize upload in durable media storage", error);
      await ctx.runMutation(internalApi.images.internalMarkStoragePersistFailed, {
        imageId: args.imageId,
        error: error?.message || "Failed to finalize upload",
      });
      if (args.scheduleAnalysis === false) {
        await ctx.runMutation(internalApi.images.internalSetAiStatus, {
          imageId: args.imageId,
          status: "failed",
        });
        return {
          ok: false,
          error: error?.message || "Failed to finalize upload",
        } as const;
      }
      try {
        const fallbackUrl = await ctx.storage.getUrl(args.storageId);
        if (!fallbackUrl) {
          throw new Error("Could not resolve temporary Convex storage URL for fallback analysis");
        }

        // Keep the upload workflow moving even if RustFS media gateway persistence fails.
        // The source file is already in Convex storage, so analysis and color sampling can still
        // complete and populate the draft card while the persistence error is surfaced separately.
        await ctx.runMutation(internalApi.images.internalSetAiStatus, {
          imageId: args.imageId,
          status: "processing",
        });

        await ctx.scheduler.runAfter(
          0,
          (internal as any).colorExtraction.internalExtractAndStoreColors,
          {
            imageId: args.imageId,
            imageUrl: fallbackUrl,
          }
        );

        await ctx.scheduler.runAfter(0, (internal as any).vision.internalSmartAnalyzeImage, {
          imageId: args.imageId,
          userId: args.userId,
          imageUrl: fallbackUrl,
          title: args.title,
          description: args.description,
          tags: args.tags,
          category: args.category,
          source: args.source,
          sref: args.sref,
          group: args.group,
          projectName: args.projectName,
          moodboardName: args.moodboardName,
          variationCount: Math.max(0, Math.min(args.variationCount ?? 2, 12)),
        });
      } catch (fallbackError: any) {
        console.error("Failed to schedule fallback analysis after RustFS persist error", fallbackError);
        await ctx.runMutation(internalApi.images.internalSetAiStatus, {
          imageId: args.imageId,
          status: "failed",
        });
      }
      return {
        ok: false,
        error: error?.message || "Failed to finalize upload",
      } as const;
    }
  },
});

export const cleanupRustfsObjects = internalAction({
  args: {
    bucket: v.string(),
    paths: v.array(v.string()),
  },
  returns: v.object({
    deleted: v.number(),
    failed: v.number(),
  }),
  handler: async (_ctx, args) => {
    const gateway = getMediaGatewayConfig();
    if (!gateway) {
      return { deleted: 0, failed: args.paths.length };
    }

    const uniquePaths = [...new Set(args.paths.map((p) => normalizePath(p)).filter(Boolean))];
    if (uniquePaths.length === 0) {
      return { deleted: 0, failed: 0 };
    }

    const response = await fetch(`${gateway.url}/delete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gateway.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucket: args.bucket || gateway.bucket,
        objectKeys: uniquePaths,
      }),
    });

    const body = await readBodyTextSafe(response);
    if (!response.ok) {
      throw new Error(`RustFS delete failed (${response.status}): ${body.slice(0, 300)}`);
    }

    const parsed = JSON.parse(body) as { deleted?: number; failed?: number };
    return {
      deleted: Number(parsed.deleted || 0),
      failed: Number(parsed.failed || 0),
    };
  },
});
