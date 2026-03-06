"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

type NextcloudConfig = {
  baseUrl: string;
  user: string;
  appPassword: string;
  uploadPrefix: string;
};

type UploadedImage = {
  imageUrl: string;
  previewUrl: string;
  storagePath: string;
  previewStoragePath: string;
};

function normalizePath(path: string): string {
  return path
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

function encodePath(path: string): string {
  return normalizePath(path)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function toKebabCase(input: string): string {
  const normalized = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return normalized || "image";
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function getNextcloudConfig(): NextcloudConfig {
  const baseUrl = process.env.NEXTCLOUD_WEBDAV_BASE_URL;
  const user = process.env.NEXTCLOUD_WEBDAV_USER;
  const appPassword = process.env.NEXTCLOUD_WEBDAV_APP_PASSWORD;
  const uploadPrefix = process.env.NEXTCLOUD_UPLOAD_PREFIX || "pindeck/media-uploads";

  if (!baseUrl || !user || !appPassword) {
    throw new Error(
      "Missing Nextcloud env vars. Required: NEXTCLOUD_WEBDAV_BASE_URL, NEXTCLOUD_WEBDAV_USER, NEXTCLOUD_WEBDAV_APP_PASSWORD"
    );
  }

  return {
    baseUrl: trimTrailingSlash(baseUrl),
    user,
    appPassword,
    uploadPrefix: normalizePath(uploadPrefix),
  };
}

function authHeader(config: NextcloudConfig): string {
  return `Basic ${Buffer.from(`${config.user}:${config.appPassword}`).toString("base64")}`;
}

function buildUrl(config: NextcloudConfig, relativePath: string): string {
  return `${config.baseUrl}/${encodePath(relativePath)}`;
}

function readBodyTextSafe(response: Response): Promise<string> {
  return response.text().catch(() => "");
}

async function ensureDirectory(config: NextcloudConfig, relativeDir: string): Promise<void> {
  const parts = normalizePath(relativeDir).split("/").filter(Boolean);
  let current = "";

  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const response = await fetch(buildUrl(config, current), {
      method: "MKCOL",
      headers: {
        Authorization: authHeader(config),
      },
    });

    if ([200, 201, 204, 301, 302, 405].includes(response.status)) {
      continue;
    }

    const body = await readBodyTextSafe(response);
    throw new Error(`MKCOL failed (${response.status}) for ${current}: ${body.slice(0, 300)}`);
  }
}

async function uploadFile(
  config: NextcloudConfig,
  relativePath: string,
  contentType: string,
  data: Buffer
): Promise<string> {
  const normalized = normalizePath(relativePath);
  const parent = normalized.split("/").slice(0, -1).join("/");
  if (!parent) throw new Error(`Invalid upload path: ${relativePath}`);

  await ensureDirectory(config, parent);

  const response = await fetch(buildUrl(config, normalized), {
    method: "PUT",
    headers: {
      Authorization: authHeader(config),
      "Content-Type": contentType || "application/octet-stream",
    },
    body: data,
  });

  if (!response.ok) {
    const body = await readBodyTextSafe(response);
    throw new Error(`PUT failed (${response.status}) for ${normalized}: ${body.slice(0, 300)}`);
  }

  return buildUrl(config, normalized);
}

async function deleteFile(config: NextcloudConfig, relativePath: string): Promise<void> {
  const normalized = normalizePath(relativePath);
  if (!normalized) return;

  const response = await fetch(buildUrl(config, normalized), {
    method: "DELETE",
    headers: {
      Authorization: authHeader(config),
    },
  });

  if ([200, 202, 204, 404].includes(response.status)) return;

  const body = await readBodyTextSafe(response);
  throw new Error(`DELETE failed (${response.status}) for ${normalized}: ${body.slice(0, 300)}`);
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

const PREVIEW_MAX_WIDTH = 800;
const PREVIEW_JPEG_QUALITY = 82;

async function buildPreview(
  buffer: Buffer,
  fallbackContentType: string,
  fallbackExtension: string
): Promise<{ data: Buffer; contentType: string; extension: string }> {
  try {
    const sharp = (await import("sharp")).default;
    const preview = await sharp(buffer)
      .resize(PREVIEW_MAX_WIDTH, null, { withoutEnlargement: true })
      .jpeg({ quality: PREVIEW_JPEG_QUALITY })
      .toBuffer();
    return {
      data: preview,
      contentType: "image/jpeg",
      extension: "jpg",
    };
  } catch (err) {
    console.warn("Preview resize failed, using original buffer", err);
    return {
      data: buffer,
      contentType: fallbackContentType || "application/octet-stream",
      extension: fallbackExtension || "jpg",
    };
  }
}

async function persistImageBuffer(args: {
  fileBuffer: Buffer;
  originalFileName?: string;
  contentType?: string;
  title?: string;
}): Promise<UploadedImage> {
  const config = getNextcloudConfig();
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  const originalExt = extensionFromInput(args.originalFileName, args.contentType);
  const baseName = toKebabCase(args.title || args.originalFileName || "image");
  const nonce = Math.random().toString(36).slice(2, 8);
  const fileBase = `${baseName}-${Date.now().toString(36)}-${nonce}`;

  const directory = normalizePath(`${config.uploadPrefix}/${year}/${month}`);
  const originalPath = `${directory}/${fileBase}.${originalExt}`;

  const preview = await buildPreview(
    args.fileBuffer,
    args.contentType || "application/octet-stream",
    originalExt
  );
  const previewPath = `${directory}/preview/${fileBase}-preview.${preview.extension}`;

  const imageUrl = await uploadFile(
    config,
    originalPath,
    args.contentType || "application/octet-stream",
    args.fileBuffer
  );
  const previewUrl = await uploadFile(config, previewPath, preview.contentType, preview.data);

  return {
    imageUrl,
    previewUrl,
    storagePath: originalPath,
    previewStoragePath: previewPath,
  };
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
  returns: v.object({
    imageUrl: v.string(),
    previewUrl: v.string(),
    storagePath: v.string(),
    previewStoragePath: v.string(),
  }),
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
      imageUrl: v.string(),
      previewUrl: v.string(),
      storagePath: v.string(),
      previewStoragePath: v.string(),
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
      return {
        ok: false,
        error: error?.message || "Failed to persist generated image",
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

      await ctx.runMutation((internal as any).images.internalApplyNextcloudUpload, {
        imageId: args.imageId,
        imageUrl: uploaded.imageUrl,
        previewUrl: uploaded.previewUrl,
        storagePath: uploaded.storagePath,
        previewStoragePath: uploaded.previewStoragePath,
      });

      try {
        await ctx.storage.delete(args.storageId);
      } catch (storageDeleteError) {
        console.warn("Failed to delete temporary Convex storage file", storageDeleteError);
      }

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

      return { ok: true, imageUrl: uploaded.imageUrl } as const;
    } catch (error: any) {
      console.error("Failed to finalize upload in Nextcloud", error);
      // Fallback path: continue using Convex storage source so upload flow remains functional.
      try {
        await ctx.scheduler.runAfter(0, (internal as any).vision.internalSmartAnalyzeImage, {
          imageId: args.imageId,
          userId: args.userId,
          storageId: args.storageId,
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
      } catch (fallbackError) {
        console.error("Fallback smart analysis scheduling failed", fallbackError);
        await ctx.runMutation((internal as any).images.internalSetAiStatus, {
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

export const cleanupNextcloudPaths = internalAction({
  args: {
    paths: v.array(v.string()),
  },
  returns: v.object({
    deleted: v.number(),
    failed: v.number(),
  }),
  handler: async (_ctx, args) => {
    const config = getNextcloudConfig();
    const uniquePaths = [...new Set(args.paths.map((p) => normalizePath(p)).filter(Boolean))];

    let deleted = 0;
    let failed = 0;

    for (const path of uniquePaths) {
      try {
        await deleteFile(config, path);
        deleted += 1;
      } catch (error) {
        failed += 1;
        console.warn("Failed to delete Nextcloud path", path, error);
      }
    }

    return { deleted, failed };
  },
});
