import { useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";

import {
  getImageUrlCandidates,
  type ImageUrlVariant,
} from "@/lib/imageUrls";

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

const LOAD_TIMEOUT_MS_BY_VARIANT: Record<ImageUrlVariant, number> = {
  dense: 2500,
  card: 2500,
  detail: 5000,
  lightbox: 7000,
};

export function SmartImage({
  image,
  variant,
  alt,
  onLoad,
  onError,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  image: ImageWithVariants | null | undefined;
  variant: ImageUrlVariant;
}) {
  const candidates = useMemo(
    () => getImageUrlCandidates(image, variant),
    [image, variant]
  );
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  useEffect(() => {
    setCandidateIndex(0);
    setLoadedSrc(null);
  }, [candidates]);

  const src = candidates[candidateIndex] || "";

  useEffect(() => {
    if (!src || loadedSrc === src || candidateIndex >= candidates.length - 1) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCandidateIndex((current) =>
        current < candidates.length - 1 ? current + 1 : current
      );
    }, LOAD_TIMEOUT_MS_BY_VARIANT[variant]);

    return () => window.clearTimeout(timeout);
  }, [candidateIndex, candidates.length, loadedSrc, src, variant]);

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      onLoad={(event) => {
        setLoadedSrc(event.currentTarget.currentSrc || src);
        onLoad?.(event);
      }}
      onError={(event) => {
        if (candidateIndex < candidates.length - 1) {
          setLoadedSrc(null);
          setCandidateIndex((current) => current + 1);
          return;
        }

        onError?.(event);
      }}
    />
  );
}
