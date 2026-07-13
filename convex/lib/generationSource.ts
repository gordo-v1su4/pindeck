import { isLikelyDirectImageUrl, normalizeImageSourceUrl } from "../colorExtractionUrls";

export function generationSourceCandidates(image: {
  imageUrl?: string;
  previewUrl?: string;
  sourceUrl?: string;
  derivativeUrls?: { large?: string; medium?: string; small?: string };
}) {
  const directSource = isLikelyDirectImageUrl(image.sourceUrl)
    ? normalizeImageSourceUrl(image.sourceUrl)
    : undefined;
  return Array.from(
    new Set(
      [
        image.derivativeUrls?.large,
        image.imageUrl,
        image.previewUrl,
        image.derivativeUrls?.medium,
        image.derivativeUrls?.small,
        directSource,
      ].filter((value): value is string => Boolean(value?.trim())),
    ),
  );
}
