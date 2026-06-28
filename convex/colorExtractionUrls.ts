/**
 * Which URL to fetch for palette extraction: prefer the durable display asset
 * so swatches match the image users actually see in cards/details.
 */
export function preferredImageUrlForSampling(img: {
  imageUrl?: string;
  previewUrl?: string;
  derivativeUrls?: { large?: string };
}): string | null {
  return (
    img.derivativeUrls?.large?.trim() ||
    img.previewUrl?.trim() ||
    img.imageUrl?.trim() ||
    null
  );
}
