import React, { useEffect, useMemo, useState } from "react";
import type {
  BlockData,
  BlockType,
  ColorPalette,
  FontStyle,
  LayoutVariant,
} from "./types";

export type DeckSectionTheme = "cinematic" | "minimal";

const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "TITLE / HERO",
  logline: "LOGLINE",
  story: "STORY / SYNOPSIS",
  world: "WORLD / CONCEPT",
  character: "CHARACTER FOCUS",
  tone: "TONE / STYLE",
  motif: "VISUAL MOTIF",
  theme: "THEMATIC STATEMENT",
  stakes: "ESCALATION / STAKES",
  closing: "CLOSING IMPACT",
  divider: "DIVIDER",
};

type TypographyPreset = {
  heroClass: string;
  headingClass: string;
  bodyClass: string;
  labelClass: string;
  heroFamily: string;
  headingFamily: string;
  bodyFamily: string;
  labelFamily: string;
};

const TYPOGRAPHY_PRESETS: Record<FontStyle, TypographyPreset> = {
  agency: {
    heroClass: "text-[clamp(4rem,12vw,10rem)] leading-[0.82] uppercase font-bold tracking-[-0.04em]",
    headingClass: "text-[clamp(2rem,4.6vw,4.8rem)] leading-[0.92] uppercase font-bold tracking-[-0.03em]",
    bodyClass: "text-[clamp(0.98rem,1.5vw,1.24rem)] leading-[1.6] font-medium",
    labelClass: "text-[10px] uppercase tracking-[0.34em] font-bold",
    heroFamily: '"Schibsted Grotesk", sans-serif',
    headingFamily: '"Schibsted Grotesk", sans-serif',
    bodyFamily: '"Karla", sans-serif',
    labelFamily: '"Schibsted Grotesk", sans-serif',
  },
  technical: {
    heroClass: "text-[clamp(4rem,10vw,8.6rem)] leading-[0.84] uppercase font-light tracking-[-0.05em]",
    headingClass: "text-[clamp(1.9rem,4.2vw,4.1rem)] leading-[0.96] uppercase font-bold tracking-[-0.03em]",
    bodyClass: "text-[clamp(0.94rem,1.35vw,1.08rem)] leading-[1.72] font-normal",
    labelClass: "text-[10px] uppercase tracking-[0.42em] font-semibold",
    heroFamily: '"IBM Plex Sans", sans-serif',
    headingFamily: '"IBM Plex Sans", sans-serif',
    bodyFamily: '"IBM Plex Sans", sans-serif',
    labelFamily: '"IBM Plex Mono", monospace',
  },
  editorial: {
    heroClass: "text-[clamp(4.3rem,11vw,9.4rem)] leading-[0.86] italic font-black tracking-[-0.04em]",
    headingClass: "text-[clamp(2.1rem,4.7vw,4.7rem)] leading-[0.96] font-bold",
    bodyClass: "text-[clamp(1rem,1.42vw,1.12rem)] leading-[1.82] font-light",
    labelClass: "text-[10px] uppercase tracking-[0.32em] font-semibold italic",
    heroFamily: '"Playfair Display", serif',
    headingFamily: '"Playfair Display", serif',
    bodyFamily: '"Source Serif 4", serif',
    labelFamily: '"Playfair Display", serif',
  },
  brutalist: {
    heroClass: "text-[clamp(4.2rem,11vw,9rem)] leading-[0.78] uppercase tracking-[-0.05em]",
    headingClass: "text-[clamp(2.1rem,4.7vw,4.8rem)] leading-[0.9] uppercase tracking-[-0.04em]",
    bodyClass: "text-[clamp(0.98rem,1.5vw,1.18rem)] leading-[1.48] uppercase font-bold tracking-tight",
    labelClass: "text-[10px] uppercase tracking-[0.36em] font-black",
    heroFamily: '"Archivo Black", sans-serif',
    headingFamily: '"Archivo Black", sans-serif',
    bodyFamily: '"Archivo", sans-serif',
    labelFamily: '"Archivo Black", sans-serif',
  },
  playful: {
    heroClass: "text-[clamp(4.5rem,13vw,10rem)] leading-[0.72] font-bold tracking-[-0.04em]",
    headingClass: "text-[clamp(2.4rem,5.2vw,5rem)] leading-[0.9] font-bold tracking-tight",
    bodyClass: "text-[clamp(1rem,1.48vw,1.16rem)] leading-[1.55] font-medium",
    labelClass: "text-[10px] uppercase tracking-[0.28em] font-bold",
    heroFamily: '"Quicksand", sans-serif',
    headingFamily: '"Quicksand", sans-serif',
    bodyFamily: '"Cabin", sans-serif',
    labelFamily: '"Quicksand", sans-serif',
  },
  "modern-clean": {
    heroClass: "text-[clamp(3.9rem,10vw,8rem)] leading-none uppercase font-thin tracking-[-0.06em]",
    headingClass: "text-[clamp(2rem,4.1vw,3.8rem)] leading-[1.03] font-light tracking-[-0.03em]",
    bodyClass: "text-[clamp(0.98rem,1.34vw,1.08rem)] leading-[1.88] font-light",
    labelClass: "text-[10px] uppercase tracking-[0.28em] font-medium",
    heroFamily: '"Inter", sans-serif',
    headingFamily: '"Inter", sans-serif',
    bodyFamily: '"Inter", sans-serif',
    labelFamily: '"Inter", sans-serif',
  },
  newspaper: {
    heroClass: "text-[clamp(4rem,10.6vw,8.6rem)] leading-[0.88] font-bold tracking-[-0.04em]",
    headingClass: "text-[clamp(2rem,4.5vw,4.4rem)] leading-[0.98] font-bold",
    bodyClass: "text-[clamp(0.98rem,1.38vw,1.1rem)] leading-[1.72] font-normal",
    labelClass: "text-[10px] uppercase tracking-[0.28em] font-bold",
    heroFamily: '"Playfair Display", serif',
    headingFamily: '"Playfair Display", serif',
    bodyFamily: '"DM Sans", sans-serif',
    labelFamily: '"JetBrains Mono", monospace',
  },
  "ibm-plex": {
    heroClass: "text-[clamp(3.9rem,10vw,8rem)] leading-[0.82] uppercase font-light tracking-[-0.05em]",
    headingClass: "text-[clamp(2rem,4.2vw,4rem)] leading-[1] uppercase font-bold tracking-[-0.03em]",
    bodyClass: "text-[clamp(0.96rem,1.34vw,1.08rem)] leading-[1.7] font-normal",
    labelClass: "text-[10px] uppercase tracking-[0.4em] font-bold",
    heroFamily: '"IBM Plex Sans", sans-serif',
    headingFamily: '"IBM Plex Sans", sans-serif',
    bodyFamily: '"IBM Plex Sans", sans-serif',
    labelFamily: '"IBM Plex Mono", monospace',
  },
  minimal: {
    heroClass: "text-[clamp(3.8rem,9.5vw,7.8rem)] leading-none uppercase font-medium tracking-[-0.04em]",
    headingClass: "text-[clamp(1.9rem,4vw,3.8rem)] leading-[1.04] font-medium tracking-[-0.02em]",
    bodyClass: "text-[clamp(0.98rem,1.34vw,1.08rem)] leading-[1.84] font-normal",
    labelClass: "text-[10px] uppercase tracking-[0.3em] font-medium",
    heroFamily: '"Geist", sans-serif',
    headingFamily: '"Geist", sans-serif',
    bodyFamily: '"Geist", sans-serif',
    labelFamily: '"Geist Mono", monospace',
  },
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function clampOverlay(opacity: number) {
  return Math.max(0, Math.min(95, opacity));
}

function accentTitleColor(blockType: BlockType, colors: ColorPalette) {
  if (blockType === "hero" || blockType === "closing") return colors.text;
  if (blockType === "stakes" || blockType === "theme") return colors.accent;
  return colors.text;
}

function contentTone(blockType: BlockType, colors: ColorPalette) {
  if (blockType === "hero") return colors.muted;
  if (blockType === "closing") return colors.text;
  return colors.muted;
}

export interface DeckSectionProps {
  block: BlockData;
  index: number;
  theme: DeckSectionTheme;
  colors: ColorPalette;
  imageUrl: string | null;
  referenceImages?: string[];
  imageIndex?: number;
  fontStyle: FontStyle;
  layoutVariant: LayoutVariant;
  overlayOpacity?: number;
  overlayEnabled?: boolean;
  isEditing?: boolean;
  onUpdate?: (block: BlockData) => void;
  selected?: boolean;
  dataGsap?: boolean;
}

export function DeckSection({
  block,
  index,
  colors,
  imageUrl,
  referenceImages = [],
  imageIndex = 0,
  fontStyle,
  layoutVariant,
  overlayOpacity = 0,
  overlayEnabled = true,
  isEditing = false,
  onUpdate,
  selected = false,
  dataGsap = true,
}: DeckSectionProps) {
  const [localTitle, setLocalTitle] = useState(block.title);
  const [localContent, setLocalContent] = useState(block.content);

  useEffect(() => {
    setLocalTitle(block.title);
    setLocalContent(block.content);
  }, [block.title, block.content]);

  const preset = TYPOGRAPHY_PRESETS[fontStyle];
  const label = BLOCK_LABELS[block.type] ?? block.type.toUpperCase();
  const overlayPercent = clampOverlay(overlayOpacity);
  const mediaPool = useMemo(() => {
    if (referenceImages.length > 0) return referenceImages;
    return imageUrl ? [imageUrl] : [];
  }, [referenceImages, imageUrl]);
  const media = useMemo(
    () =>
      Array.from({ length: 5 }, (_, offset) =>
        mediaPool.length ? mediaPool[(imageIndex + offset) % mediaPool.length] : null
      ),
    [mediaPool, imageIndex]
  );
  const titleColor = accentTitleColor(block.type, colors);
  const bodyColor = contentTone(block.type, colors);

  const updateBlock = () => {
    if (!onUpdate) return;
    if (localTitle === block.title && localContent === block.content) return;
    onUpdate({ ...block, title: localTitle, content: localContent });
  };

  if (block.type === "divider") {
    return (
      <section
        className="h-12 border-b border-white/10"
        style={{ backgroundColor: colors.background }}
      />
    );
  }

  const overlayGradient = overlayEnabled
    ? {
        background: `linear-gradient(180deg, rgba(0,0,0,${Math.min(
          0.86,
          overlayPercent / 100 + 0.24
        )}) 0%, rgba(0,0,0,${Math.min(0.72, overlayPercent / 140 + 0.16)}) 45%, rgba(0,0,0,${Math.min(
          0.42,
          overlayPercent / 240 + 0.06
        )}) 100%)`,
      }
    : undefined;

  const sectionProps = {
    className: classNames(
      "relative min-h-[72vh] overflow-hidden border-b border-white/8 lg:min-h-[56.25vw]",
      "snap-start scroll-mt-4",
      selected && "ring-1 ring-amber-400/50"
    ),
    style: {
      backgroundColor: colors.background,
      color: colors.text,
    },
    ...(dataGsap ? { "data-anim": "section", "data-block": block.type } : {}),
  };

  const labelStyle = {
    color: colors.muted,
    fontFamily: preset.labelFamily,
  };

  const editableLabel = (
    <span className={preset.labelClass} style={labelStyle}>
      {label}
    </span>
  );

  const titleNode = isEditing && onUpdate ? (
    <input
      value={localTitle}
      onChange={(event) => setLocalTitle(event.target.value)}
      onBlur={updateBlock}
      className="w-full border-b border-white/15 bg-transparent pb-3 outline-none"
      style={{
        color: titleColor,
        fontFamily: block.type === "hero" || block.type === "closing" ? preset.heroFamily : preset.headingFamily,
      }}
    />
  ) : (
    <h2
      className={
        block.type === "hero" || block.type === "closing" ? preset.heroClass : preset.headingClass
      }
      style={{
        color: titleColor,
        fontFamily: block.type === "hero" || block.type === "closing" ? preset.heroFamily : preset.headingFamily,
      }}
    >
      {block.title}
    </h2>
  );

  const contentNode = isEditing && onUpdate ? (
    <textarea
      value={localContent}
      onChange={(event) => setLocalContent(event.target.value)}
      onBlur={updateBlock}
      rows={5}
      className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 outline-none"
      style={{ color: bodyColor, fontFamily: preset.bodyFamily }}
    />
  ) : (
    <p className={preset.bodyClass} style={{ color: bodyColor, fontFamily: preset.bodyFamily }}>
      {block.content}
    </p>
  );

  const sectionBadge = (
    <div
      className="inline-flex items-center gap-3 rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.28em]"
      style={{
        color: colors.muted,
        borderColor: `${colors.border}99`,
        backgroundColor: `${colors.surface}cc`,
        backdropFilter: "blur(12px)",
      }}
    >
      <span>{label}</span>
      <span>{String(index + 1).padStart(2, "0")}</span>
    </div>
  );

  const renderEditorial = () => {
    if (block.type === "hero") {
      return (
        <section {...sectionProps}>
          <div className="absolute inset-0">
            {media[0] ? (
              <img src={media[0]} alt="" className="h-full w-full object-cover" data-anim="image" />
            ) : (
              <div className="h-full w-full" style={{ backgroundColor: colors.surface }} />
            )}
            <div className="absolute inset-0" style={overlayGradient} />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 35%, rgba(255,255,255,0.08) 100%)",
              }}
            />
          </div>
          <div className="relative z-10 flex min-h-[72vh] flex-col justify-between px-5 py-6 sm:px-8 lg:min-h-[56.25vw] lg:px-12 lg:py-10">
            <div className="flex justify-between gap-4">{sectionBadge}</div>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-end">
              <div className="max-w-4xl">
                {titleNode}
              </div>
              <div
                className="max-w-md rounded-[2rem] border p-5"
                style={{
                  borderColor: `${colors.border}88`,
                  backgroundColor: `${colors.surface}b8`,
                  backdropFilter: "blur(14px)",
                }}
              >
                <div className="mb-4">{editableLabel}</div>
                {contentNode}
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (block.type === "logline" || block.type === "story") {
      return (
        <section {...sectionProps}>
          <div className="grid min-h-[72vh] lg:min-h-[56.25vw] lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative order-2 flex items-center px-5 py-8 sm:px-8 lg:order-1 lg:px-12">
              <div className="max-w-xl space-y-6">
                {editableLabel}
                {titleNode}
                <div className="h-px w-24" style={{ backgroundColor: colors.accent }} />
                {contentNode}
              </div>
              <div
                className="absolute bottom-0 left-0 top-0 w-1"
                style={{ background: `linear-gradient(180deg, ${colors.primary}, ${colors.accent})` }}
              />
            </div>
            <div className="relative order-1 min-h-[18rem] lg:order-2 lg:min-h-full">
              {media[0] ? (
                <img src={media[0]} alt="" className="h-full w-full object-cover" data-anim="image" />
              ) : (
                <div className="h-full w-full" style={{ backgroundColor: colors.surface }} />
              )}
              <div className="absolute inset-0" style={overlayGradient} />
            </div>
          </div>
        </section>
      );
    }

    if (block.type === "world" || block.type === "tone" || block.type === "motif") {
      return (
        <section {...sectionProps}>
          <div className="px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4 max-w-3xl">
                {editableLabel}
                {titleNode}
              </div>
              <div className="max-w-xl">{contentNode}</div>
            </div>
            <div className="grid gap-3 md:grid-cols-12">
              <div className="md:col-span-7 min-h-[16rem] overflow-hidden rounded-[2rem]">
                {media[0] ? (
                  <img src={media[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full" style={{ backgroundColor: colors.surface }} />
                )}
              </div>
              <div className="grid gap-3 md:col-span-5">
                {[media[1], media[2], media[3]].map((item, cardIndex) => (
                  <div
                    key={`${block.id}-${cardIndex}`}
                    className="min-h-[10rem] overflow-hidden rounded-[1.5rem] border"
                    style={{
                      borderColor: `${colors.border}66`,
                      backgroundColor: colors.surface,
                    }}
                  >
                    {item ? (
                      <img src={item} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (block.type === "character") {
      return (
        <section {...sectionProps}>
          <div className="grid min-h-[72vh] items-stretch gap-0 lg:min-h-[56.25vw] lg:grid-cols-[0.85fr_1.15fr]">
            <div className="relative min-h-[22rem] overflow-hidden">
              {media[0] ? (
                <img src={media[0]} alt="" className="h-full w-full object-cover grayscale-[0.08]" />
              ) : (
                <div className="h-full w-full" style={{ backgroundColor: colors.surface }} />
              )}
              <div className="absolute inset-0" style={overlayGradient} />
            </div>
            <div className="relative flex items-center px-5 py-8 sm:px-8 lg:px-12">
              <div className="max-w-3xl space-y-6">
                {editableLabel}
                {titleNode}
                <div className="h-1 w-28 rounded-full" style={{ backgroundColor: colors.accent }} />
                {contentNode}
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (block.type === "theme" || block.type === "stakes") {
      return (
        <section {...sectionProps}>
          <div className="relative flex min-h-[72vh] items-center justify-center px-5 py-8 sm:px-8 lg:min-h-[56.25vw] lg:px-12">
            <div
              className="absolute inset-0 opacity-60"
              style={{
                background: `radial-gradient(circle at 20% 20%, ${colors.primary}22 0%, transparent 44%), radial-gradient(circle at 80% 70%, ${colors.accent}1f 0%, transparent 40%)`,
              }}
            />
            <div
              className="relative z-10 max-w-4xl rounded-[2.25rem] border px-6 py-8 text-center sm:px-10 lg:px-14 lg:py-12"
              style={{
                borderColor: `${colors.border}88`,
                backgroundColor: `${colors.surface}d4`,
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="mb-6 flex justify-center">{editableLabel}</div>
              <div className="mb-6">{titleNode}</div>
              {contentNode}
            </div>
          </div>
        </section>
      );
    }

    return (
      <section {...sectionProps}>
        <div className="absolute inset-0">
          {media[0] ? (
            <img src={media[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ backgroundColor: colors.surface }} />
          )}
          <div className="absolute inset-0" style={overlayGradient} />
        </div>
        <div className="relative z-10 flex min-h-[72vh] items-end px-5 py-8 sm:px-8 lg:min-h-[56.25vw] lg:px-12">
          <div className="max-w-4xl space-y-5">
            {editableLabel}
            <div className="max-w-3xl">{contentNode}</div>
            {titleNode}
          </div>
        </div>
      </section>
    );
  };

  const renderCollage = () => {
    if (block.type === "hero") {
      return (
        <section {...sectionProps}>
          <div className="grid min-h-[72vh] gap-4 px-5 py-6 sm:px-8 lg:min-h-[56.25vw] lg:grid-cols-[1.18fr_0.82fr] lg:px-12 lg:py-10">
            <div className="overflow-hidden rounded-[2rem] border" style={{ borderColor: `${colors.border}66` }}>
              {media[0] ? (
                <img src={media[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full" style={{ backgroundColor: colors.surface }} />
              )}
            </div>
            <div className="flex flex-col justify-between gap-4">
              <div className="flex justify-between gap-4">{sectionBadge}</div>
              <div
                className="rounded-[2rem] border p-6"
                style={{
                  borderColor: `${colors.border}88`,
                  backgroundColor: `${colors.surface}cc`,
                }}
              >
                {titleNode}
              </div>
              <div
                className="rounded-[2rem] border p-6"
                style={{
                  borderColor: `${colors.border}66`,
                  backgroundColor: `${colors.background}e6`,
                }}
              >
                <div className="mb-4">{editableLabel}</div>
                {contentNode}
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (block.type === "logline" || block.type === "story" || block.type === "character") {
      return (
        <section {...sectionProps}>
          <div className="grid min-h-[72vh] gap-4 px-5 py-6 sm:px-8 lg:min-h-[56.25vw] lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-10">
            <div
              className="rounded-[2rem] border p-6"
              style={{
                borderColor: `${colors.border}88`,
                backgroundColor: `${colors.surface}d6`,
              }}
            >
              <div className="mb-5">{editableLabel}</div>
              <div className="space-y-6">
                {titleNode}
                {contentNode}
              </div>
            </div>
            <div className="grid gap-4">
              <div className="overflow-hidden rounded-[2rem] border" style={{ borderColor: `${colors.border}66` }}>
                {media[0] ? (
                  <img src={media[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full" style={{ backgroundColor: colors.surface }} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[media[1], media[2]].map((item, cardIndex) => (
                  <div
                    key={`${block.id}-secondary-${cardIndex}`}
                    className="min-h-[10rem] overflow-hidden rounded-[1.5rem] border"
                    style={{ borderColor: `${colors.border}55`, backgroundColor: colors.surface }}
                  >
                    {item ? <img src={item} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (block.type === "world" || block.type === "tone" || block.type === "motif") {
      return (
        <section {...sectionProps}>
          <div className="grid min-h-[72vh] gap-4 px-5 py-6 sm:px-8 lg:min-h-[56.25vw] lg:grid-cols-3 lg:px-12 lg:py-10">
            <div className="overflow-hidden rounded-[2rem] border" style={{ borderColor: `${colors.border}66` }}>
              {media[0] ? <img src={media[0]} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full" style={{ backgroundColor: colors.surface }} />}
            </div>
            <div
              className="flex flex-col justify-center rounded-[2rem] border p-6"
              style={{
                borderColor: `${colors.border}88`,
                backgroundColor: `${colors.surface}d6`,
              }}
            >
              <div className="mb-4">{editableLabel}</div>
              <div className="mb-6">{titleNode}</div>
              {contentNode}
            </div>
            <div className="grid gap-4">
              {[media[1], media[2], media[3]].map((item, cardIndex) => (
                <div
                  key={`${block.id}-stack-${cardIndex}`}
                  className="overflow-hidden rounded-[1.5rem] border"
                  style={{ borderColor: `${colors.border}55`, backgroundColor: colors.surface }}
                >
                  {item ? <img src={item} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full min-h-[8rem]" />}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (block.type === "theme" || block.type === "stakes") {
      return (
        <section {...sectionProps}>
          <div className="relative flex min-h-[72vh] items-center justify-center px-5 py-6 sm:px-8 lg:min-h-[56.25vw] lg:px-12">
            <div
              className="absolute inset-0 opacity-50"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}10 0%, transparent 36%, ${colors.accent}14 100%)`,
              }}
            />
            <div
              className="relative z-10 max-w-4xl rounded-[2.2rem] border p-8 lg:p-12"
              style={{
                borderColor: `${colors.border}88`,
                backgroundColor: `${colors.background}ef`,
              }}
            >
              <div className="mb-6 flex justify-between gap-4">
                {editableLabel}
                <span
                  className={preset.labelClass}
                  style={{ ...labelStyle, color: colors.accent }}
                >
                  QUOTE
                </span>
              </div>
              <div className="mb-5">{titleNode}</div>
              {contentNode}
            </div>
          </div>
        </section>
      );
    }

    return (
      <section {...sectionProps}>
        <div className="absolute inset-0">
          {media[0] ? (
            <img src={media[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ backgroundColor: colors.surface }} />
          )}
          <div className="absolute inset-0" style={overlayGradient} />
        </div>
        <div className="relative z-10 flex min-h-[72vh] items-center justify-center px-5 py-6 sm:px-8 lg:min-h-[56.25vw] lg:px-12">
          <div
            className="max-w-3xl rounded-[2.25rem] border p-8 text-center lg:p-12"
            style={{
              borderColor: `${colors.border}88`,
              backgroundColor: `${colors.background}da`,
              backdropFilter: "blur(10px)",
            }}
          >
            <div className="mb-5 flex justify-center">{editableLabel}</div>
            <div className="mb-4">{titleNode}</div>
            {contentNode}
          </div>
        </div>
      </section>
    );
  };

  return layoutVariant === "editorial" ? renderEditorial() : renderCollage();
}
