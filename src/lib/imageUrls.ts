type ImageWithVariants = {
  imageUrl?: string;
  previewUrl?: string;
  sourceUrl?: string;
  derivativeUrls?: {
    small?: string;
    medium?: string;
    large?: string;
  };
};

export type ImageUrlVariant = "dense" | "card" | "detail" | "lightbox";

function uniqueUrls(values: Array<string | undefined>): string[] {
  return values.filter((value, index, array): value is string => {
    return Boolean(value) && array.indexOf(value) === index;
  });
}

function looksLikeImageUrl(value: string | undefined): value is string {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    const host = parsed.host.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (/\.(avif|gif|jpe?g|png|webp)$/i.test(path)) {
      return true;
    }

    return [
      "fal.media",
      "cdn.midjourney.com",
      "cdn.discordapp.com",
      "media.discordapp.net",
      "images.unsplash.com",
      "i.pinimg.com",
      "s.mj.run",
    ].some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

export function getImageUrlCandidates(
  image: ImageWithVariants | null | undefined,
  variant: ImageUrlVariant
): string[] {
  if (!image) return [];

  const sourceCandidate = looksLikeImageUrl(image.sourceUrl)
    ? image.sourceUrl
    : undefined;

  if (variant === "dense") {
    return uniqueUrls([
      image.derivativeUrls?.small,
      image.previewUrl,
      image.derivativeUrls?.medium,
      image.derivativeUrls?.large,
      image.imageUrl,
      sourceCandidate,
    ]);
  }

  if (variant === "detail") {
    return uniqueUrls([
      image.derivativeUrls?.medium,
      image.derivativeUrls?.large,
      image.imageUrl,
      image.previewUrl,
      image.derivativeUrls?.small,
      sourceCandidate,
    ]);
  }

  if (variant === "lightbox") {
    return uniqueUrls([
      image.derivativeUrls?.large,
      image.imageUrl,
      image.derivativeUrls?.medium,
      image.previewUrl,
      image.derivativeUrls?.small,
      sourceCandidate,
    ]);
  }

  return uniqueUrls([
    image.derivativeUrls?.small,
    image.previewUrl,
    image.derivativeUrls?.medium,
    image.derivativeUrls?.large,
    image.imageUrl,
    sourceCandidate,
  ]);
}

export function getDenseThumbnailUrl(
  image: ImageWithVariants | null | undefined
): string {
  if (!image) return "";
  return getImageUrlCandidates(image, "dense")[0] || "";
}

export function getCardImageUrl(
  image: ImageWithVariants | null | undefined
): string {
  if (!image) return "";
  return getImageUrlCandidates(image, "card")[0] || "";
}

export function getDetailImageUrl(
  image: ImageWithVariants | null | undefined
): string {
  if (!image) return "";
  return getImageUrlCandidates(image, "detail")[0] || "";
}
