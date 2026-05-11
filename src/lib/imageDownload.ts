type DownloadableImage = {
  title?: string;
  imageUrl?: string;
  previewUrl?: string;
  sourceUrl?: string;
  derivativeUrls?: {
    small?: string;
    medium?: string;
    large?: string;
  };
};

function safeFileName(value: string | undefined, fallback: string) {
  const name = (value || fallback).trim() || fallback;
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

export function getHighResImageUrl(image: DownloadableImage | null | undefined) {
  return (
    image?.derivativeUrls?.large ||
    image?.imageUrl ||
    image?.sourceUrl ||
    image?.previewUrl ||
    null
  );
}

export function downloadImage(image: DownloadableImage, index = 0) {
  const url = getHighResImageUrl(image);
  if (!url) return false;

  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(image.title, `pindeck-image-${index + 1}`)}.png`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

export function downloadImages(images: DownloadableImage[]) {
  images.forEach((image, index) => {
    downloadImage(image, index);
  });
  return images.filter((image) => Boolean(getHighResImageUrl(image))).length;
}
