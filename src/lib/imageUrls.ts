type ImageWithVariants = {
  imageUrl?: string;
  previewUrl?: string;
  derivativeUrls?: {
    small?: string;
    medium?: string;
    large?: string;
  };
};

export function getDenseThumbnailUrl(
  image: ImageWithVariants | null | undefined
): string {
  if (!image) return "";
  return (
    image.derivativeUrls?.small ||
    image.previewUrl ||
    image.derivativeUrls?.medium ||
    image.derivativeUrls?.large ||
    image.imageUrl ||
    ""
  );
}

export function getCardImageUrl(
  image: ImageWithVariants | null | undefined
): string {
  if (!image) return "";
  return (
    image.previewUrl ||
    image.derivativeUrls?.medium ||
    image.derivativeUrls?.small ||
    image.derivativeUrls?.large ||
    image.imageUrl ||
    ""
  );
}

export function getDetailImageUrl(
  image: ImageWithVariants | null | undefined
): string {
  if (!image) return "";
  return (
    image.derivativeUrls?.large ||
    image.derivativeUrls?.medium ||
    image.previewUrl ||
    image.derivativeUrls?.small ||
    image.imageUrl ||
    ""
  );
}
