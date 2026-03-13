type ImageWithVariants = {
  imageUrl?: string;
  previewUrl?: string;
  derivativeUrls?: {
    small?: string;
    medium?: string;
    large?: string;
  };
};

export function getThumbnailUrl(
  image: ImageWithVariants | null | undefined,
  size: "small" | "medium" = "small"
): string {
  if (!image) return "";

  if (size === "medium") {
    return (
      image.derivativeUrls?.medium ||
      image.derivativeUrls?.small ||
      image.previewUrl ||
      image.imageUrl ||
      ""
    );
  }

  return (
    image.derivativeUrls?.small ||
    image.previewUrl ||
    image.derivativeUrls?.medium ||
    image.imageUrl ||
    ""
  );
}
