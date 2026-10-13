/** Preserve the complete reference combination and its order. */
export function formatSref(raw: string | undefined): string {
  const ids = raw?.match(/\d+/g);
  return ids?.length ? `--sref ${ids.join(" ")}` : "";
}
