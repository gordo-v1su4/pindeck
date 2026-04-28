/**
 * Which URL to fetch for palette extraction: prefer the primary gallery `imageUrl`
 * so swatches match what users see; use `derivativeUrls.large` only when the main URL is missing.
 */
export function preferredImageUrlForSampling(img: {
  imageUrl?: string;
  derivativeUrls?: { large?: string };
}): string | null {
  const primary = img.imageUrl?.trim();
  if (primary) return primary;
  return img.derivativeUrls?.large?.trim() || null;
}
