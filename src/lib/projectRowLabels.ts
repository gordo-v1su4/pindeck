const LEADING_MARKDOWN_EMPHASIS = /^\s*[*_]{1,3}\s*/;
const TRAILING_MARKDOWN_EMPHASIS = /\s*[*_]{1,3}\s*$/;
const LEADING_MARKDOWN_LINK = /^<https?:\/\/[^>]+>\s*/i;
const LEADING_BARE_URL = /^https?:\/\/\S+\s*/i;

export function formatProjectRowLabel(raw: string): string {
  const withoutMarkup = raw
    .replace(LEADING_MARKDOWN_EMPHASIS, "")
    .replace(TRAILING_MARKDOWN_EMPHASIS, "")
    .replace(LEADING_MARKDOWN_LINK, "")
    .replace(LEADING_BARE_URL, "")
    .trim();

  return withoutMarkup || "Imported Project";
}
