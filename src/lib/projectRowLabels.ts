const LEADING_MARKDOWN_EMPHASIS = /^\s*[*_]{1,3}\s*/;
const TRAILING_MARKDOWN_EMPHASIS = /\s*[*_]{1,3}\s*$/;
const LEADING_MARKDOWN_LINK = /^<https?:\/\/[^>]+>\s*/i;
const LEADING_BARE_URL = /^https?:\/\/\S+\s*/i;
const GENERATION_SETTINGS = /\s+--(?:ar|aspect|chaos|sref|cref|seed|raw|style|stylize|quality|version|niji|weird|tile|no|stop|repeat|iw|sw|sv|cw|profile|fast|relax|turbo|draft|exp|q|s|v|w|r|p)\b[\s\S]*$/i;

export function formatProjectRowLabel(raw: string): string {
  const withoutMarkup = raw
    .replace(LEADING_MARKDOWN_EMPHASIS, "")
    .replace(TRAILING_MARKDOWN_EMPHASIS, "")
    .replace(LEADING_MARKDOWN_LINK, "")
    .replace(LEADING_BARE_URL, "")
    .replace(GENERATION_SETTINGS, "")
    .replace(TRAILING_MARKDOWN_EMPHASIS, "")
    .trim();

  return withoutMarkup || "Imported Project";
}
