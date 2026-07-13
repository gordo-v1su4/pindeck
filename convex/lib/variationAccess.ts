export function canGenerateVariationFromImage(
  image: { uploadedBy: string; status?: string },
  userId: string,
) {
  return image.uploadedBy === userId || image.status === "active";
}
