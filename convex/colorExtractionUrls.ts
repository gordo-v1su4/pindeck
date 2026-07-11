/**
 * Which URL to fetch for palette extraction: prefer the durable display asset
 * so swatches match the image users actually see in cards/details.
 */
const DIRECT_IMAGE_HOSTS = [
  "fal.media",
  "cdn.midjourney.com",
  "cdn.discordapp.com",
  "media.discordapp.net",
  "images.unsplash.com",
  "i.pinimg.com",
  "s.mj.run",
];

export function normalizeImageSourceUrl(rawUrl: unknown): string {
  return String(rawUrl ?? "")
    .trim()
    .replace(/[>\]),.;!?]+$/g, "")
    .trim();
}

export function isLikelyDirectImageUrl(rawUrl: unknown): boolean {
  const value = normalizeImageSourceUrl(rawUrl);
  if (!value) return false;
  try {
    const parsed = new URL(value);
    const host = parsed.host.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    return /\.(avif|gif|jpe?g|png|webp)$/i.test(path) ||
      DIRECT_IMAGE_HOSTS.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

export function preferredImageUrlForSampling(img: {
  imageUrl?: string;
  previewUrl?: string;
  sourceUrl?: string;
  derivativeUrls?: { large?: string; medium?: string; small?: string };
}): string | null {
  const sourceUrl = isLikelyDirectImageUrl(img.sourceUrl)
    ? normalizeImageSourceUrl(img.sourceUrl)
    : null;
  return (
    sourceUrl ||
    img.imageUrl?.trim() ||
    img.derivativeUrls?.large?.trim() ||
    img.previewUrl?.trim() ||
    img.derivativeUrls?.medium?.trim() ||
    img.derivativeUrls?.small?.trim() ||
    null
  );
}
