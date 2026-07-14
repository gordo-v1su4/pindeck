export function safeProviderMessage(value?: string) {
  if (!value) return undefined;
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/gi, "[provider URL]")
    .replace(
      /\b(?:authorization|api[_ -]?key|token)\s*[:=]\s*\S+/gi,
      "[redacted]",
    )
    .trim()
    .slice(0, 240);
}
