/**
 * Canonical storage paths and public URL construction.
 * Convex `mediaStorage` actions call these adapters; do not duplicate
 * path-normalization or public-URL formulas in color extraction / ingest / repair.
 */

export type StorageProvider = "convex" | "nextcloud" | "rustfs";

export const RUSTFS_PUBLIC_HOST = "s3.v1su4.dev";
export const NEXTCLOUD_PUBLIC_HOST = "cloud.v1su4.dev";

export function normalizeStoragePath(path: string): string {
  return path
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

export function encodeStoragePath(path: string): string {
  return normalizeStoragePath(path)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function toKebabCase(input: string): string {
  const normalized = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return normalized || "image";
}

export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function parseMediaUrlHost(rawUrl: unknown): string | undefined {
  try {
    return new URL(String(rawUrl ?? "")).host.toLowerCase();
  } catch {
    return undefined;
  }
}

export function isRustfsPublicUrl(rawUrl: unknown): boolean {
  return parseMediaUrlHost(rawUrl) === RUSTFS_PUBLIC_HOST;
}

export function isNextcloudPublicUrl(rawUrl: unknown): boolean {
  return parseMediaUrlHost(rawUrl) === NEXTCLOUD_PUBLIC_HOST;
}

export function rustfsPublicUrl(args: {
  bucket: string;
  storagePath: string;
  host?: string;
}): string {
  const host = args.host ?? RUSTFS_PUBLIC_HOST;
  const path = encodeStoragePath(
    `${normalizeStoragePath(args.bucket)}/${normalizeStoragePath(args.storagePath)}`,
  );
  return `https://${host}/${path}`;
}

export function nextcloudPublicDavUrl(args: {
  publicBaseUrl: string;
  token: string;
  relativePath: string;
}): string {
  const segments = normalizeStoragePath(args.relativePath)
    .split("/")
    .filter(Boolean);
  if (segments.length === 0) {
    throw new Error(
      `Cannot build a public file URL for folder path ${args.relativePath}`,
    );
  }
  const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join("/");
  return `${trimTrailingSlash(args.publicBaseUrl)}/public.php/dav/files/${encodeURIComponent(
    args.token,
  )}/${encodedPath}`;
}

export type PublicUrlInput = {
  storagePath: string;
  bucket?: string;
  publicBaseUrl?: string;
  token?: string;
};

export interface MediaPathAdapter {
  readonly provider: StorageProvider;
  normalize(path: string): string;
  publicUrl(input: PublicUrlInput): string;
}

export const rustfsPathAdapter: MediaPathAdapter = {
  provider: "rustfs",
  normalize: normalizeStoragePath,
  publicUrl(input) {
    if (!input.bucket) {
      throw new Error("RustFS public URLs require a bucket");
    }
    return rustfsPublicUrl({
      bucket: input.bucket,
      storagePath: input.storagePath,
    });
  },
};

export const nextcloudPathAdapter: MediaPathAdapter = {
  provider: "nextcloud",
  normalize: normalizeStoragePath,
  publicUrl(input) {
    if (!input.publicBaseUrl || !input.token) {
      throw new Error("Nextcloud public URLs require publicBaseUrl and token");
    }
    return nextcloudPublicDavUrl({
      publicBaseUrl: input.publicBaseUrl,
      token: input.token,
      relativePath: input.storagePath,
    });
  },
};

export const convexStoragePathAdapter: MediaPathAdapter = {
  provider: "convex",
  normalize: normalizeStoragePath,
  publicUrl() {
    throw new Error(
      "Convex storage serves URLs via ctx.storage.getUrl, not object paths",
    );
  },
};

export function adapterForProvider(provider: StorageProvider): MediaPathAdapter {
  switch (provider) {
    case "rustfs":
      return rustfsPathAdapter;
    case "nextcloud":
      return nextcloudPathAdapter;
    case "convex":
      return convexStoragePathAdapter;
    default: {
      const _never: never = provider;
      return _never;
    }
  }
}
