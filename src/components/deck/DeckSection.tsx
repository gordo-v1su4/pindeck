/**
 * Deck section component — TMP pitch-deck-builder-app style.
 * Layout A: grid with image + content panel (accent border).
 * Layout B: full-width with centered card and backdrop blur.
 */
import React, { useState, useEffect, useRef } from "react";
import type { BlockData, ColorPalette } from "./types";
import type { BlockType } from "./types";

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
  divider: "—",
};

const cinematicSizes: Record<BlockType, string> = {
  hero: "text-6xl md:text-9xl font-black tracking-tight uppercase",
  logline: "text-4xl md:text-7xl font-extrabold uppercase",
  story: "text-3xl md:text-6xl font-extrabold uppercase",
  world: "text-5xl md:text-8xl font-black uppercase",
  character: "text-4xl md:text-7xl font-black uppercase",
  tone: "text-3xl md:text-6xl font-extrabold uppercase",
  motif: "text-4xl md:text-7xl font-black uppercase",
  theme: "text-3xl md:text-6xl font-extrabold uppercase",
  stakes: "text-5xl md:text-8xl font-black uppercase",
  closing: "text-4xl md:text-7xl font-black uppercase",
  divider: "text-sm",
};

const minimalSizes: Record<BlockType, string> = {
  hero: "text-3xl md:text-6xl font-light tracking-wide",
  logline: "text-2xl md:text-4xl font-medium",
  story: "text-2xl md:text-4xl font-light",
  world: "text-3xl md:text-5xl font-light",
  character: "text-2xl md:text-5xl font-medium",
  tone: "text-2xl md:text-4xl font-light",
  motif: "text-3xl md:text-5xl font-light",
  theme: "text-2xl md:text-4xl font-medium",
  stakes: "text-3xl md:text-6xl font-light",
  closing: "text-3xl md:text-5xl font-medium",
  divider: "text-sm",
};

function ColorChip({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-7 w-7 border border-white/20"
      style={{ background: color }}
    />
  );
}

export interface DeckSectionProps {
  block: BlockData;
  index: number;
  theme: DeckSectionTheme;
  colors: ColorPalette;
  imageUrl: string | null;
  isEditing?: boolean;
  onUpdate?: (block: BlockData) => void;
  selected?: boolean;
  /** Optional data attribute for GSAP */
  dataGsap?: boolean;
}

export function DeckSection({
  block,
  index,
  theme,
  colors,
  imageUrl,
  isEditing = false,
  onUpdate,
  selected = false,
  dataGsap = true,
}: DeckSectionProps) {
  const [localTitle, setLocalTitle] = useState(block.title);
  const [localContent, setLocalContent] = useState(block.content);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setLocalTitle(block.title);
    setLocalContent(block.content);
  }, [block.title, block.content]);

  const handleTitleBlur = () => {
    if (onUpdate && (localTitle !== block.title || localContent !== block.content)) {
      onUpdate({ ...block, title: localTitle, content: localContent });
    }
  };

  const layout = block.layout;
  const label = block.type === "divider" ? "" : BLOCK_LABELS[block.type] ?? block.type.toUpperCase();
  const isCinematic = theme === "cinematic";
  const titleClass = isCinematic ? cinematicSizes[block.type] : minimalSizes[block.type];
  const bodySize = isCinematic ? "text-sm md:text-base" : "text-sm md:text-base leading-relaxed";
  const sectionHeight = "min-h-[56.25vw] md:min-h-[540px]";
  const mutedColor = `${colors.light}99`;
  const bgHex = colors.dark + "f0";
  const surfaceHex = colors.dark + "e8";

  if (block.type === "divider") {
    return (
      <div
        className="w-full border-b border-white/10"
        style={{ height: "48px", background: colors.dark }}
      />
    );
  }

  const contentNode = (
    <>
      <p className="mb-3 text-[10px] tracking-[0.32em] text-white/70">{label}</p>
      {isEditing && onUpdate ? (
        <>
          <input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500/50"
            style={{ color: block.type === "hero" || block.type === "stakes" ? colors.accent : colors.light }}
          />
          <textarea
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            onBlur={handleTitleBlur}
            className="mt-4 w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500/50 resize-none"
            rows={3}
            style={{ color: mutedColor }}
          />
        </>
      ) : (
        <>
          <h2
            ref={titleRef}
            className={`${titleClass} ${isCinematic ? "leading-[0.84]" : "leading-[1.02]"}`}
            style={{
              color: block.type === "hero" || block.type === "stakes" ? colors.accent : colors.light,
            }}
            data-anim="title"
          >
            {block.title}
          </h2>
          <p
            ref={contentRef}
            className={`${bodySize} mt-4 ${block.type === "logline" ? "max-w-[30ch]" : "max-w-[44ch]"}`}
            style={{ color: mutedColor }}
          >
            {block.content}
          </p>
        </>
      )}
    </>
  );

  const sectionProps = {
    className: `relative border-b border-white/10 ${sectionHeight} ${selected ? "ring-1 ring-offset-0 ring-amber-500/50" : ""}`,
    ...(dataGsap ? { "data-anim": "section", "data-block": block.type } : {}),
  };

  if (layout === "A") {
    return (
      <section {...sectionProps}>
        <div className="relative grid h-full md:grid-cols-12">
          <div
            className={`relative ${index % 2 === 0 ? "md:col-span-8" : "md:col-span-6 md:order-2"}`}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover opacity-70"
                data-anim="image"
              />
            ) : (
              <div className="h-full w-full" style={{ background: surfaceHex }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/35 to-transparent" />
          </div>
          <div
            className={`relative flex ${index % 2 === 0 ? "md:col-span-4" : "md:col-span-6 md:order-1"} ${block.type === "hero" ? "items-end" : index % 3 === 0 ? "items-center" : "items-start"}`}
            style={{ background: bgHex }}
          >
            <div
              className={`w-full ${block.type === "hero" ? "p-6 md:p-12" : block.type === "theme" ? "p-10 md:p-16" : "p-6 md:p-10"}`}
            >
              {contentNode}
            </div>
            <span
              className="absolute left-0 top-0 h-full w-[5px]"
              style={{ background: index % 2 ? colors.secondary : colors.primary }}
            />
            {block.type === "hero" && (
              <span
                className="absolute right-4 top-4 border px-2 py-1 text-[10px] uppercase tracking-[0.28em]"
                style={{ borderColor: colors.accent, color: colors.accent }}
              >
                Option A
              </span>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Layout B: full-width, centered card
  return (
    <section {...sectionProps}>
      <div className="relative h-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(145deg, ${colors.dark}, ${surfaceHex})`,
          }}
        />
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className={`absolute object-cover ${index % 2 === 0 ? "right-0 top-0 h-full w-[68%]" : "left-0 top-0 h-full w-[68%]"} opacity-35`}
            data-anim="image"
          />
        )}
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 mx-auto flex h-full max-w-6xl items-center p-6 md:p-12">
          <div
            className={`${index % 2 === 0 ? "ml-auto" : ""} ${block.type === "theme" || block.type === "closing" ? "max-w-2xl" : "max-w-3xl"} border border-white/15 p-6 md:p-10`}
            style={{
              background: "rgba(8, 10, 14, 0.72)",
              backdropFilter: "blur(3px)",
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[10px] tracking-[0.3em] text-white/70">{label}</p>
              <div className="flex gap-1.5">
                {[colors.primary, colors.secondary, colors.accent].map((c) => (
                  <ColorChip key={c} color={c} />
                ))}
              </div>
            </div>
            {isEditing && onUpdate ? (
              <>
                <input
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500/50 mb-2"
                  style={{ color: colors.light }}
                />
                <textarea
                  value={localContent}
                  onChange={(e) => setLocalContent(e.target.value)}
                  onBlur={handleTitleBlur}
                  className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500/50 resize-none mt-2"
                  rows={3}
                  style={{ color: mutedColor }}
                />
              </>
            ) : (
              <>
                <h2
                  className={`${titleClass} ${isCinematic ? "tracking-tight" : "tracking-wide"}`}
                  style={{ color: colors.light }}
                  data-anim="title"
                >
                  {block.title}
                </h2>
                <p className={`${bodySize} mt-4 max-w-[58ch]`} style={{ color: mutedColor }}>
                  {block.content}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
