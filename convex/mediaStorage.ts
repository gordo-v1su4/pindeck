"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { preferredImageUrlForSampling } from "./colorExtractionUrls";

type NextcloudConfig = {
  baseUrl: string;
  serverBaseUrl: string;
  user: string;
  appPassword: string;
  uploadPrefix: string;
};

type NextcloudPublicShareConfig = {
  token: string;
  rootPath: string;
  publicBaseUrl: string;
};

type MediaGatewayConfig = {
  url: string;
  token: string;
  userId: string;
};

type UploadedImage = {
  imageUrl: string;
  previewUrl: string;
  storagePath: string;
  previewStoragePath: string;
  derivativeUrls: {
    small: string;
    medium: string;
    large: string;
  };
  derivativeStoragePaths: {
    small: string;
    medium: string;
    large: string;
  };
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

function getNextcloudServerBaseUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  const remotePhpIndex = parsed.pathname.indexOf("/remote.php/");
  const basePath =
    remotePhpIndex >= 0 ? parsed.pathname.slice(0, remotePhpIndex) : parsed.pathname;
  return trimTrailingSlash(`${parsed.origin}${basePath}`);
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
    serverBaseUrl: getNextcloudServerBaseUrl(baseUrl),
    user,
    appPassword,
    uploadPrefix: normalizePath(uploadPrefix),
  };
}

function getNextcloudPublicShareConfig(
  config: NextcloudConfig
): NextcloudPublicShareConfig | null {
  const token = process.env.NEXTCLOUD_PUBLIC_SHARE_TOKEN?.trim();
  if (!token) {
    return null;
  }

  return {
    token,
    rootPath: normalizePath(
      process.env.NEXTCLOUD_PUBLIC_SHARE_PATH || config.uploadPrefix
    ),
    publicBaseUrl: trimTrailingSlash(
      process.env.NEXTCLOUD_PUBLIC_BASE_URL || config.serverBaseUrl
    ),
  };
}

function getNextcloudUploadShareToken(): string {
  const token = process.env.NEXTCLOUD_UPLOAD_SHARE_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Missing NEXTCLOUD_UPLOAD_SHARE_TOKEN while using shared-folder Nextcloud uploads"
    );
  }
  return token;
}

function getMediaGatewayConfig(): MediaGatewayConfig | null {
  const url = process.env.MEDIA_GATEWAY_URL;
  const token = process.env.MEDIA_GATEWAY_TOKEN;
  const userId = process.env.NEXTCLOUD_WEBDAV_USER;

  if (!url || !token || !userId) {
    return null;
  }

  return {
    url: trimTrailingSlash(url),
    token,
    userId,
  };
}

function authHeader(config: NextcloudConfig): string {
  return `Basic ${Buffer.from(`${config.user}:${config.appPassword}`).toString("base64")}`;
}

function buildUrl(config: NextcloudConfig, relativePath: string): string {
  return `${config.baseUrl}/${encodePath(relativePath)}`;
}

function buildShareApiUrl(config: NextcloudConfig): string {
  return `${config.serverBaseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`;
}

function getSharedRelativePath(
  shareConfig: NextcloudPublicShareConfig,
  relativePath: string
): string {
  const normalized = normalizePath(relativePath);
  const rootPath = normalizePath(shareConfig.rootPath);

  if (!normalized || !rootPath) {
    throw new Error("Cannot resolve Nextcloud shared path without a valid path");
  }

  if (normalized !== rootPath && !normalized.startsWith(`${rootPath}/`)) {
    throw new Error(
      `Path ${normalized} is outside the shared Nextcloud root ${rootPath}`
    );
  }

  return normalized === rootPath ? "" : normalized.slice(rootPath.length + 1);
}

function buildSharedFolderPublicUrl(
  shareConfig: NextcloudPublicShareConfig,
  relativePath: string
): string {
  const normalized = normalizePath(relativePath);
  const segments = getSharedRelativePath(shareConfig, normalized).split("/").filter(Boolean);
  if (segments.length === 0) {
    throw new Error(`Cannot build a public file URL for folder path ${normalized}`);
  }
  const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join("/");
  return `${shareConfig.publicBaseUrl}/public.php/dav/files/${encodeURIComponent(
    shareConfig.token
  )}/${encodedPath}`;
}

function buildSharedFolderUploadUrl(
  shareConfig: NextcloudPublicShareConfig,
  relativePath: string
): string {
  const normalized = normalizePath(relativePath);
  const segments = getSharedRelativePath(shareConfig, normalized).split("/").filter(Boolean);
  const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join("/");
  return `${shareConfig.publicBaseUrl}/public.php/dav/files/${encodeURIComponent(
    getNextcloudUploadShareToken()
  )}/${encodedPath}`;
}

function readBodyTextSafe(response: Response): Promise<string> {
  return response.text().catch(() => "");
}

function extractXmlTag(text: string, tagName: string): string | undefined {
  const match = text.match(new RegExp(`<${tagName}>([^<]+)</${tagName}>`, "i"));
  return match?.[1]?.trim().replace(/&amp;/g, "&");
}

async function ensureDirectory(config: NextcloudConfig, relativeDir: string): Promise<void> {
  const publicShare = getNextcloudPublicShareConfig(config);
  if (publicShare) {
    const parts = getSharedRelativePath(publicShare, relativeDir).split("/").filter(Boolean);
    let current = "";

    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const response = await fetch(
        buildSharedFolderUploadUrl(publicShare, `${publicShare.rootPath}/${current}`),
        {
          method: "MKCOL",
        }
      );

      if ([200, 201, 204, 301, 302, 405].includes(response.status)) {
        continue;
      }

      const body = await readBodyTextSafe(response);
      throw new Error(`MKCOL failed (${response.status}) for ${current}: ${body.slice(0, 300)}`);
    }
    return;
  }

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

  const publicShare = getNextcloudPublicShareConfig(config);
  if (publicShare) {
    const uploadUrl = buildSharedFolderUploadUrl(publicShare, normalized);
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType || "application/octet-stream",
      },
      body: toBinaryBody(data),
    });

    if (!response.ok) {
      const body = await readBodyTextSafe(response);
      throw new Error(`PUT failed (${response.status}) for ${normalized}: ${body.slice(0, 300)}`);
    }

    return buildSharedFolderPublicUrl(publicShare, normalized);
  }

  const response = await fetch(buildUrl(config, normalized), {
    method: "PUT",
    headers: {
      Authorization: authHeader(config),
      "Content-Type": contentType || "application/octet-stream",
    },
    body: toBinaryBody(data),
  });

  if (!response.ok) {
    const body = await readBodyTextSafe(response);
    throw new Error(`PUT failed (${response.status}) for ${normalized}: ${body.slice(0, 300)}`);
  }

  return buildUrl(config, normalized);
}

function toBinaryBody(data: Buffer): ArrayBuffer {
  const bytes = Uint8Array.from(data);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

async function createPublicShareUrl(config: NextcloudConfig, relativePath: string): Promise<string> {
  const normalized = normalizePath(relativePath);
  const response = await fetch(buildShareApiUrl(config), {
    method: "POST",
    headers: {
      Authorization: authHeader(config),
      "OCS-APIRequest": "true",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      path: `/${normalized}`,
      shareType: "3",
      permissions: "1",
    }),
  });

  const body = await readBodyTextSafe(response);
  if (!response.ok) {
    throw new Error(`OCS share failed (${response.status}) for ${normalized}: ${body.slice(0, 300)}`);
  }

  const shareUrl = extractXmlTag(body, "url");
  if (!shareUrl) {
    throw new Error(`OCS share response missing public URL for ${normalized}: ${body.slice(0, 300)}`);
  }

  return `${shareUrl.replace(/\/+$/, "")}/download`;
}

async function uploadAndShareFile(
  config: NextcloudConfig,
  relativePath: string,
  contentType: string,
  data: Buffer
): Promise<string> {
  const publicShare = getNextcloudPublicShareConfig(config);
  if (publicShare) {
    return await uploadFile(config, relativePath, contentType, data);
  }
  await uploadFile(config, relativePath, contentType, data);
  return await createPublicShareUrl(config, relativePath);
}

function fileNameFromPath(path: string): string {
  return normalizePath(path).split("/").pop() || "file";
}

function folderFromPath(path: string): string {
  const parts = normalizePath(path).split("/");
  parts.pop();
  return parts.join("/");
}

async function uploadViaMediaGateway(args: {
  gateway: MediaGatewayConfig;
  relativePath: string;
  contentType: string;
  data: Buffer;
}): Promise<{ publicUrl: string; path: string }> {
  const formData = new FormData();
  formData.append("userId", args.gateway.userId);
  formData.append("folder", folderFromPath(args.relativePath));
  formData.append(
    "file",
    new Blob([toBinaryBody(args.data)], {
      type: args.contentType || "application/octet-stream",
    }),
    fileNameFromPath(args.relativePath)
  );

  const response = await fetch(`${args.gateway.url}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.gateway.token}`,
    },
    body: formData,
  });

  const body = await readBodyTextSafe(response);
  if (!response.ok) {
    throw new Error(`Media gateway upload failed (${response.status}) for ${args.relativePath}: ${body.slice(0, 300)}`);
  }

  const parsed = JSON.parse(body) as { publicUrl?: string; path?: string };
  if (!parsed.publicUrl || !parsed.path) {
    throw new Error(`Media gateway response missing fields for ${args.relativePath}: ${body.slice(0, 300)}`);
  }

  return {
    publicUrl: parsed.publicUrl,
    path: normalizePath(parsed.path),
  };
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
    imageUrl: parsed.imageUrl,
    previewUrl: parsed.previewUrl,
    storagePath: normalizePath(parsed.storagePath),
    previewStoragePath: normalizePath(parsed.previewStoragePath),
    derivativeUrls: parsed.derivativeUrls,
    derivativeStoragePaths: {
      small: normalizePath(parsed.derivativeStoragePaths.small),
      medium: normalizePath(parsed.derivativeStoragePaths.medium),
      large: normalizePath(parsed.derivativeStoragePaths.large),
    },
  };
}

async function fetchPrivateNextcloudFile(
  config: NextcloudConfig,
  relativePath: string
): Promise<{ data: Buffer; contentType: string }> {
  const response = await fetch(buildUrl(config, relativePath), {
    method: "GET",
    headers: {
      Authorization: authHeader(config),
    },
  });

  if (!response.ok) {
    const body = await readBodyTextSafe(response);
    throw new Error(`Private Nextcloud fetch failed (${response.status}) for ${relativePath}: ${body.slice(0, 300)}`);
  }

  return {
    data: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}

async function deleteFile(config: NextcloudConfig, relativePath: string): Promise<void> {
  const normalized = normalizePath(relativePath);
  if (!normalized) return;

  const publicShare = getNextcloudPublicShareConfig(config);
  if (publicShare) {
    const response = await fetch(buildSharedFolderUploadUrl(publicShare, normalized), {
      method: "DELETE",
    });

    if ([200, 202, 204, 404].includes(response.status)) return;

    const body = await readBodyTextSafe(response);
    throw new Error(`DELETE failed (${response.status}) for ${normalized}: ${body.slice(0, 300)}`);
  }

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

const PREVIEW_WIDTH = 640;
const PREVIEW_HEIGHT = 360;

const DERIVATIVE_DIMENSIONS = {
  small: { width: 320, height: 180 },
  medium: { width: 1280, height: 720 },
  large: { width: 1920, height: 1080 },
} as const;

async function buildPreview(
  buffer: Buffer,
  fallbackContentType: string,
  fallbackExtension: string
): Promise<{ data: Buffer; contentType: string; extension: string }> {
  const sharp = await loadSharp();
  if (!sharp) {
    return {
      data: buffer,
      contentType: fallbackContentType || "application/octet-stream",
      extension: fallbackExtension || "jpg",
    };
  }
  const previewData = await sharp(buffer)
    .rotate()
    .trim({ threshold: 10 })
    .resize({
      width: PREVIEW_WIDTH,
      height: PREVIEW_HEIGHT,
      fit: "cover",
      position: "attention",
      withoutEnlargement: false,
    })
    .webp({ quality: 78 })
    .toBuffer();
  return {
    data: previewData,
    contentType: "image/webp",
    extension: "webp",
  };
}

async function buildDerivative(
  buffer: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  const sharp = await loadSharp();
  if (!sharp) return buffer;
  return await sharp(buffer)
    .rotate()
    .trim({ threshold: 10 })
    .resize({
      width,
      height,
      fit: "cover",
      position: "attention",
      withoutEnlargement: false,
    })
    .webp({ quality: 82 })
    .toBuffer();
}

let sharpLoader: Promise<((input: Buffer) => any) | null> | null = null;
let sharpWarnedUnavailable = false;

async function loadSharp(): Promise<((input: Buffer) => any) | null> {
  if (!sharpLoader) {
    sharpLoader = (async () => {
      try {
        const mod: any = await import("sharp");
        return (mod?.default || mod) as (input: Buffer) => any;
      } catch {
        if (!sharpWarnedUnavailable) {
          sharpWarnedUnavailable = true;
          console.warn(
            "Sharp unavailable in runtime; using original buffer for preview/derivatives."
          );
        }
        return null;
      }
    })();
  }
  return await sharpLoader;
}

async function persistImageBuffer(args: {
  fileBuffer: Buffer;
  originalFileName?: string;
  contentType?: string;
  title?: string;
}): Promise<UploadedImage> {
  const config = getNextcloudConfig();
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

  const directory = normalizePath(`${config.uploadPrefix}/${year}/${monthDay}`);
  const originalPath = `${directory}/original/${fileBase}.${originalExt}`;

  if (mediaGateway) {
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

  const preview = await buildPreview(
    args.fileBuffer,
    args.contentType || "application/octet-stream",
    originalExt
  );
  const previewPath = `${directory}/preview/${fileBase}-preview.${preview.extension}`;
  const [smallData, mediumData, largeData] = await Promise.all([
    buildDerivative(
      args.fileBuffer,
      DERIVATIVE_DIMENSIONS.small.width,
      DERIVATIVE_DIMENSIONS.small.height
    ),
    buildDerivative(
      args.fileBuffer,
      DERIVATIVE_DIMENSIONS.medium.width,
      DERIVATIVE_DIMENSIONS.medium.height
    ),
    buildDerivative(
      args.fileBuffer,
      DERIVATIVE_DIMENSIONS.large.width,
      DERIVATIVE_DIMENSIONS.large.height
    ),
  ]);

  // If sharp is unavailable, buildDerivative returns the original buffer reference.
  // Skip derivative uploads in that case to avoid storing corrupted webp-labeled files.
  const sharpAvailable = smallData !== args.fileBuffer;

  const uploadPublicFile = async (
    relativePath: string,
    contentType: string,
    data: Buffer
  ): Promise<{ publicUrl: string; storagePath: string }> => {
    return {
      publicUrl: await uploadAndShareFile(config, relativePath, contentType, data),
      storagePath: relativePath,
    };
  };

  const originalUpload = await uploadPublicFile(
    originalPath,
    args.contentType || "application/octet-stream",
    args.fileBuffer
  );
  const previewUpload = await uploadPublicFile(previewPath, preview.contentType, preview.data);
  const imageUrl = originalUpload.publicUrl;
  const previewUrl = previewUpload.publicUrl;
  const resolvedOriginalPath = originalUpload.storagePath;
  const resolvedPreviewPath = previewUpload.storagePath;

  if (!sharpAvailable) {
    throw new Error(
      "Image derivatives could not be generated. Media gateway is unavailable and Sharp is not usable in this runtime."
    );
  }

  const derivativePaths = {
    small: `${directory}/low/${fileBase}-w320.webp`,
    medium: `${directory}/high/${fileBase}-w1280.webp`,
    large: `${directory}/high/${fileBase}-w1920.webp`,
  };
  const [smallUpload, mediumUpload, largeUpload] = await Promise.all([
    uploadPublicFile(derivativePaths.small, "image/webp", smallData),
    uploadPublicFile(derivativePaths.medium, "image/webp", mediumData),
    uploadPublicFile(derivativePaths.large, "image/webp", largeData),
  ]);

  return {
    imageUrl,
    previewUrl,
    storagePath: resolvedOriginalPath,
    previewStoragePath: resolvedPreviewPath,
    derivativeUrls: {
      small: smallUpload.publicUrl,
      medium: mediumUpload.publicUrl,
      large: largeUpload.publicUrl,
    },
    derivativeStoragePaths: {
      small: smallUpload.storagePath,
      medium: mediumUpload.storagePath,
      large: largeUpload.storagePath,
    },
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
    derivativeUrls: v.object({
      small: v.string(),
      medium: v.string(),
      large: v.string(),
    }),
    derivativeStoragePaths: v.object({
      small: v.string(),
      medium: v.string(),
      large: v.string(),
    }),
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
      derivativeUrls: v.object({
        small: v.string(),
        medium: v.string(),
        large: v.string(),
      }),
      derivativeStoragePaths: v.object({
        small: v.string(),
        medium: v.string(),
        large: v.string(),
      }),
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
      const isNextcloudUnconfigured = /Missing Nextcloud env/i.test(msg);
      return {
        ok: false,
        error: isNextcloudUnconfigured ? "Nextcloud not configured" : msg,
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
        derivativeUrls: uploaded.derivativeUrls,
        derivativeStoragePaths: uploaded.derivativeStoragePaths,
      });

      try {
        await ctx.storage.delete(args.storageId);
      } catch (storageDeleteError) {
        console.warn("Failed to delete temporary Convex storage file", storageDeleteError);
      }

      // Pixel-accurate color sampling (runs in parallel with VLM analyze).
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

      return { ok: true, imageUrl: uploaded.imageUrl } as const;
    } catch (error: any) {
      console.error("Failed to finalize upload in Nextcloud", error);
      await ctx.runMutation((internal as any).images.internalMarkNextcloudPersistFailed, {
        imageId: args.imageId,
        error: error?.message || "Failed to finalize upload",
      });
      try {
        const fallbackUrl = await ctx.storage.getUrl(args.storageId);
        if (!fallbackUrl) {
          throw new Error("Could not resolve temporary Convex storage URL for fallback analysis");
        }

        // Keep the upload workflow moving even if Nextcloud/media gateway persistence fails.
        // The source file is already in Convex storage, so analysis and color sampling can still
        // complete and populate the draft card while the persistence error is surfaced separately.
        await ctx.runMutation((internal as any).images.internalSetAiStatus, {
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
        console.error("Failed to schedule fallback analysis after Nextcloud persist error", fallbackError);
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

export const publishStoredImagePaths = internalAction({
  args: {
    storagePath: v.string(),
    previewStoragePath: v.optional(v.string()),
    derivativeStoragePaths: v.optional(
      v.object({
        small: v.string(),
        medium: v.string(),
        large: v.string(),
      })
    ),
  },
  returns: v.object({
    imageUrl: v.string(),
    previewUrl: v.optional(v.string()),
    derivativeUrls: v.optional(
      v.object({
        small: v.string(),
        medium: v.string(),
        large: v.string(),
      })
    ),
  }),
  handler: async (_ctx, args) => {
    const config = getNextcloudConfig();
    const mediaGateway = getMediaGatewayConfig();
    const publicShare = getNextcloudPublicShareConfig(config);

    const publishPath = async (relativePath: string): Promise<string> => {
      if (publicShare) {
        return buildSharedFolderPublicUrl(publicShare, relativePath);
      }

      try {
        return await createPublicShareUrl(config, relativePath);
      } catch (error) {
        if (!mediaGateway) throw error;
        const privateFile = await fetchPrivateNextcloudFile(config, relativePath);
        const uploaded = await uploadViaMediaGateway({
          gateway: mediaGateway,
          relativePath,
          contentType: privateFile.contentType,
          data: privateFile.data,
        });
        return uploaded.publicUrl;
      }
    };

    const imageUrl = await publishPath(args.storagePath);
    const previewUrl = args.previewStoragePath
      ? await publishPath(args.previewStoragePath)
      : undefined;
    const derivativeUrls = args.derivativeStoragePaths
      ? {
          small: await publishPath(args.derivativeStoragePaths.small),
          medium: await publishPath(args.derivativeStoragePaths.medium),
          large: await publishPath(args.derivativeStoragePaths.large),
        }
      : undefined;

    return {
      imageUrl,
      previewUrl,
      derivativeUrls,
    };
  },
});

export const reprocessStoredImagePaths = internalAction({
  args: {
    storagePath: v.string(),
    title: v.optional(v.string()),
  },
  returns: v.object({
    imageUrl: v.string(),
    previewUrl: v.string(),
    storagePath: v.string(),
    previewStoragePath: v.string(),
    derivativeUrls: v.object({
      small: v.string(),
      medium: v.string(),
      large: v.string(),
    }),
    derivativeStoragePaths: v.object({
      small: v.string(),
      medium: v.string(),
      large: v.string(),
    }),
  }),
  handler: async (_ctx, args) => {
    const config = getNextcloudConfig();
    const source = await fetchPrivateNextcloudFile(config, args.storagePath);
    return await persistImageBuffer({
      fileBuffer: source.data,
      contentType: source.contentType,
      originalFileName: fileNameFromPath(args.storagePath),
      title: args.title,
    });
  },
});

/** Upload a small test file, verify it is readable, then delete it. Use to confirm Nextcloud env and connectivity. Leaves no test files behind. */
export const testNextcloudPersistence = internalAction({
  args: {},
  returns: v.union(
    v.object({ ok: v.literal(true) }),
    v.object({ ok: v.literal(false), error: v.string() })
  ),
  handler: async (_ctx): Promise<{ ok: true } | { ok: false; error: string }> => {
    let testPath: string | undefined;
    try {
      const config = getNextcloudConfig();
      const publicShare = getNextcloudPublicShareConfig(config);
      testPath = normalizePath(
        `${config.uploadPrefix}/_test/pindeck-persistence-test-${Date.now()}.txt`
      );
      const payload = Buffer.from("Pindeck Nextcloud persistence test", "utf8");
      const url = await uploadFile(config, testPath, "text/plain", payload);

      const check = await fetch(url, { method: "GET", headers: { Authorization: authHeader(config) } });
      if (!check.ok) {
        await deleteFile(config, testPath).catch(() => {});
        return { ok: false, error: `GET test file failed: ${check.status}` };
      }

      const publicUrl = publicShare
        ? buildSharedFolderPublicUrl(publicShare, testPath)
        : await createPublicShareUrl(config, testPath);
      const publicCheck = await fetch(publicUrl, { method: "GET" });
      if (!publicCheck.ok) {
        await deleteFile(config, testPath).catch(() => {});
        return { ok: false, error: `Public GET test file failed: ${publicCheck.status}` };
      }

      await deleteFile(config, testPath);
      return { ok: true } as const;
    } catch (error: unknown) {
      if (testPath) {
        try {
          const config = getNextcloudConfig();
          await deleteFile(config, testPath);
        } catch {
          // ignore cleanup failure
        }
      }
      const message = error instanceof Error ? error.message : "Nextcloud persistence test failed";
      return { ok: false, error: message };
    }
  },
});
