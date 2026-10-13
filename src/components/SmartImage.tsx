import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

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

export function SmartImage({
  image,
  variant,
  alt,
  onLoad,
  onError,
  loading,
  decoding = "async",
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  image: ImageWithVariants | null | undefined;
  variant: ImageUrlVariant;
}) {
  const candidates = getImageUrlCandidates(image, variant);
  const candidateKey = JSON.stringify(candidates);
  const [selection, setSelection] = useState({ key: candidateKey, index: 0 });
  const candidateIndex = selection.key === candidateKey ? selection.index : 0;
  const imageRef = useRef<HTMLImageElement>(null);
  const lazy = loading === "lazy" || (
    loading !== "eager" && (variant === "card" || variant === "dense")
  );
  const [activated, setActivated] = useState(!lazy);
  const src = !lazy || activated ? candidates[candidateIndex] : undefined;

  useEffect(() => {
    if (!lazy || activated || !imageRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActivated(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(imageRef.current);
    return () => observer.disconnect();
  }, [lazy, activated]);

  return (
    <img
      {...props}
      ref={imageRef}
      src={src}
      alt={alt}
      loading={loading ?? (lazy ? "lazy" : "eager")}
      decoding={decoding}
      onLoad={(event) => {
        onLoad?.(event);
      }}
      onError={(event) => {
        if (candidateIndex < candidates.length - 1) {
          setSelection({ key: candidateKey, index: candidateIndex + 1 });
          return;
        }

        onError?.(event);
      }}
    />
  );
}
