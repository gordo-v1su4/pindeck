import type { Id } from "../../../convex/_generated/dataModel";
import type { BlockData, BlockType, ColorPalette, FontStyle, LayoutVariant, StyleVariant } from "./types";
import { defaultColors } from "./utils/colorExtractor";

function withAliases(palette: Partial<ColorPalette> | undefined): ColorPalette {
  const merged = {
    ...defaultColors,
    ...(palette ?? {}),
  };

  const background =
    merged.background ?? merged.dark ?? defaultColors.background;
  const text = merged.text ?? merged.light ?? defaultColors.text;

  return {
    ...defaultColors,
    ...merged,
    background,
    surface: merged.surface ?? defaultColors.surface,
    text,
    muted: merged.muted ?? defaultColors.muted,
    border: merged.border ?? defaultColors.border,
    tertiary: merged.tertiary ?? defaultColors.tertiary,
    dark: background,
    light: text,
  };
}

type StoredDeckBlock = {
  id: string;
  label: string;
  on: boolean;
  locked: boolean;
  kind: string;
  variant: string;
  content?: string;
};

export function blocksToSchema(blocks: BlockData[]): StoredDeckBlock[] {
  return blocks.map((block) => ({
    id: block.id,
    label: block.title,
    on: block.visible,
    locked: block.locked ?? false,
    kind: block.type,
    variant: block.layout,
    content: block.content,
  }));
}

export function blocksFromSchema(
  stored: StoredDeckBlock[] | undefined,
  fallback: BlockData[],
): BlockData[] {
  if (!stored?.length) return fallback;
  return stored.map((block) => ({
    id: block.id,
    type: block.kind as BlockType,
    title: block.label,
    content: block.content ?? "",
    layout: block.variant === "B" ? "B" : "A",
    visible: block.on,
    locked: block.locked,
  }));
}

export function paletteToSchema(colors: ColorPalette): string[] {
  return [
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.tertiary,
    colors.background,
    colors.surface,
    colors.text,
    colors.muted,
    colors.border,
  ];
}

export function paletteFromSchema(
  palette: string[] | undefined,
  fallback: ColorPalette,
): ColorPalette {
  if (!palette?.length || palette.length < 5) return fallback;
  return withAliases({
    primary: palette[0],
    secondary: palette[1] ?? palette[0],
    accent: palette[2] ?? palette[0],
    tertiary: palette[3] ?? palette[1] ?? palette[0],
    background: palette[4] ?? fallback.background,
    surface: palette[5] ?? palette[4] ?? fallback.surface,
    text: palette[6] ?? fallback.text,
    muted: palette[7] ?? fallback.muted,
    border: palette[8] ?? palette[2] ?? fallback.border,
    dark: palette[4] ?? fallback.dark,
    light: palette[6] ?? fallback.light,
  });
}

export function slidesFromReferenceImages(
  referenceImages: string[],
  urlToSlide: Map<string, { imageId: Id<"images">; layout: string }>,
): Array<{ imageId: Id<"images">; layout: string; order: number }> {
  const slides: Array<{ imageId: Id<"images">; layout: string; order: number }> = [];
  let order = 1;
  for (const url of referenceImages) {
    if (!url) continue;
    const match = urlToSlide.get(url);
    if (!match) continue;
    slides.push({ imageId: match.imageId, layout: match.layout, order: order++ });
  }
  return slides;
}

export function parseStyleVariant(value: string | undefined): StyleVariant {
  const allowed: StyleVariant[] = ["cinematic", "bold", "minimal", "noir", "neon"];
  if (value && allowed.includes(value as StyleVariant)) {
    return value as StyleVariant;
  }
  return "cinematic";
}

export function parseLayoutVariant(value: string | undefined): LayoutVariant {
  return value === "collage" ? "collage" : "editorial";
}

export function parseFontStyle(value: string | undefined): FontStyle {
  const allowed: FontStyle[] = [
    "agency",
    "technical",
    "editorial",
    "brutalist",
    "playful",
    "modern-clean",
    "newspaper",
    "ibm-plex",
    "minimal",
  ];
  if (value && allowed.includes(value as FontStyle)) {
    return value as FontStyle;
  }
  return "agency";
}

export function parseScrollFx(value: string | undefined): "parallax" | "snap" | "kinetic" | "dolly" | "sequence" {
  const allowed = ["parallax", "snap", "kinetic", "dolly", "sequence"] as const;
  if (value && allowed.includes(value as (typeof allowed)[number])) {
    return value as (typeof allowed)[number];
  }
  return "parallax";
}
