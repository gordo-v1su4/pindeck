import type { CSSProperties, ReactNode } from "react";
import type {
  BlockData,
  ColorPalette,
  FontStyle,
  LayoutVariant,
} from "./types";
import { cn } from "./utils/cn";

type DeckCanvasPageProps = {
  title: string;
  blocks: BlockData[];
  colors: ColorPalette;
  referenceImages: string[];
  selectedBlockId: string;
  onSelectBlock: (blockId: string) => void;
  fontStyle: FontStyle;
  layoutVariant: LayoutVariant;
  overlayStrength: number;
  editable?: boolean;
};

type FontStack = {
  display: string;
  body: string;
  serif: string;
};

const FONT_STACKS: Record<FontStyle, FontStack> = {
  agency: {
    display: '"Schibsted Grotesk", sans-serif',
    body: '"Karla", sans-serif',
    serif: '"Playfair Display", serif',
  },
  technical: {
    display: '"IBM Plex Sans", sans-serif',
    body: '"IBM Plex Sans", sans-serif',
    serif: '"IBM Plex Sans", sans-serif',
  },
  editorial: {
    display: '"Playfair Display", serif',
    body: '"Source Serif 4", serif',
    serif: '"Playfair Display", serif',
  },
  brutalist: {
    display: '"Archivo Black", sans-serif',
    body: '"Archivo", sans-serif',
    serif: '"Playfair Display", serif',
  },
  playful: {
    display: '"Quicksand", sans-serif',
    body: '"Cabin", sans-serif',
    serif: '"Playfair Display", serif',
  },
  "modern-clean": {
    display: '"Inter", sans-serif',
    body: '"Inter", sans-serif',
    serif: '"Playfair Display", serif',
  },
  newspaper: {
    display: '"Playfair Display", serif',
    body: '"DM Sans", sans-serif',
    serif: '"Playfair Display", serif',
  },
  "ibm-plex": {
    display: '"IBM Plex Sans", sans-serif',
    body: '"IBM Plex Sans", sans-serif',
    serif: '"IBM Plex Sans", sans-serif',
  },
  minimal: {
    display: '"Geist", sans-serif',
    body: '"Geist", sans-serif',
    serif: '"Playfair Display", serif',
  },
};

function imageAt(referenceImages: string[], index: number) {
  if (referenceImages.length === 0) return null;
  return referenceImages[index % referenceImages.length] ?? null;
}

function sectionLabel(block: BlockData, index: number) {
  return `${String(index + 1).padStart(2, "0")} ${block.title}`;
}

function referenceStills(
  referenceImages: string[],
  startIndex: number,
  count: number,
) {
  return Array.from({ length: count }, (_, offset) =>
    imageAt(referenceImages, startIndex + offset),
  );
}

function paletteSwatches(colors: ColorPalette) {
  return [
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.tertiary,
    colors.surface,
  ].filter(Boolean);
}

function BlockFrame({
  block,
  index,
  selected,
  editable,
  onSelect,
  className,
  children,
}: {
  block: BlockData;
  index: number;
  selected: boolean;
  editable: boolean;
  onSelect: (blockId: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "slide-block relative aspect-video overflow-hidden bg-black",
        editable && "cursor-pointer",
        className,
      )}
      onClick={editable ? () => onSelect(block.id) : undefined}
      style={{ containerType: "inline-size" }}
      data-selected={editable && selected ? "true" : undefined}
    >
      {editable ? (
        <div className="pointer-events-none absolute right-4 top-4 z-20 font-mono text-[9px] uppercase tracking-[0.2em] text-white/32">
          {sectionLabel(block, index)}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function CanvasImage({
  src,
  className,
  style,
}: {
  src: string | null;
  className?: string;
  style?: CSSProperties;
}) {
  if (!src) {
    return (
      <div
        className={cn("h-full w-full bg-[#111114]", className)}
        style={style}
      />
    );
  }

  return (
    <img
      src={src}
      alt="Deck reference"
      className={cn("h-full w-full object-cover", className)}
      style={style}
    />
  );
}

export function DeckCanvasPage({
  title,
  blocks,
  colors,
  referenceImages,
  selectedBlockId,
  onSelectBlock,
  fontStyle,
  layoutVariant,
  overlayStrength,
  editable = true,
}: DeckCanvasPageProps) {
  const fonts = FONT_STACKS[fontStyle] ?? FONT_STACKS.agency;
  const accent = colors.accent || colors.primary || "#b86b40";
  const text = colors.text || "#f5f5f0";
  const muted = colors.muted || "rgba(255,255,255,0.62)";
  const base: CSSProperties = {
    backgroundColor: colors.background || "#050506",
    color: text,
    fontFamily: fonts.body,
  };
  const overlay = Math.max(0.18, Math.min(0.86, overlayStrength / 100));
  const visible = blocks.filter((block) => block.visible);
  if (visible.length === 0) {
    return (
      <div className="flex min-h-[42rem] items-center justify-center border border-white/10 bg-black text-sm text-white/45">
        No visible blocks. Enable sections from the block list.
      </div>
    );
  }

  return (
    <div
      className="deck-canvas-page flex flex-col gap-3 bg-[#050507]"
      style={base}
    >
      {visible.map((block, index) => {
        const selected = block.id === selectedBlockId;
        const img = imageAt(referenceImages, index);
        const [next, third, fourth] = referenceStills(
          referenceImages,
          index + 1,
          3,
        );
        const dense = layoutVariant === "collage" || block.layout === "B";

        if (block.type === "hero") {
          const displayTitle = block.title || title;
          const compactTitle = displayTitle.length > 24;

          return (
            <BlockFrame
              key={block.id}
              block={block}
              index={index}
              selected={selected}
              editable={editable}
              onSelect={onSelectBlock}
            >
              <div className="relative h-full bg-black">
                <CanvasImage
                  src={img}
                  className="absolute inset-[-4%] h-[108%] w-[108%] opacity-80 saturate-[1.08] contrast-[1.05]"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(180deg, rgba(0,0,0,${overlay * 0.55}) 0%, rgba(0,0,0,0.08) 44%, rgba(0,0,0,${overlay}) 100%)`,
                  }}
                />
                <div className="absolute inset-0 flex flex-col justify-end p-[6%]">
                  <div
                    className="mb-5 font-mono text-[10px] uppercase tracking-[0.26em]"
                    style={{ color: accent }}
                  >
                    PINDECK / {title || "Untitled deck"}
                  </div>
                  <h1
                    className="max-w-[82%] text-balance font-black uppercase leading-[0.86] tracking-[-0.07em]"
                    style={{
                      fontFamily: fonts.display,
                      fontSize: compactTitle
                        ? "clamp(2.15rem, 8.2cqw, 4.9rem)"
                        : "clamp(3rem, 12cqw, 6.5rem)",
                    }}
                  >
                    {displayTitle}
                  </h1>
                  <p
                    className="mt-4 max-w-[58cqw] text-[clamp(0.65rem,1.45cqw,0.95rem)] italic leading-relaxed text-white/70"
                    style={{ fontFamily: fonts.serif }}
                  >
                    {block.content}
                  </p>
                </div>
                <span className="absolute bottom-2 left-2 h-3 w-3 border-b border-l border-white/25" />
                <span className="absolute bottom-2 right-2 h-3 w-3 border-b border-r border-white/25" />
                <span className="absolute left-2 top-2 h-3 w-3 border-l border-t border-white/25" />
                <span className="absolute right-2 top-2 h-3 w-3 border-r border-t border-white/25" />
              </div>
            </BlockFrame>
          );
        }

        if (block.type === "logline") {
          return (
            <BlockFrame
              key={block.id}
              block={block}
              index={index}
              selected={selected}
              editable={editable}
              onSelect={onSelectBlock}
            >
              <div className="grid h-full grid-cols-[0.95fr_1.55fr] bg-black">
                <div
                  className="relative overflow-hidden"
                  style={{ backgroundColor: accent }}
                >
                  <CanvasImage
                    src={img}
                    className="absolute inset-0 opacity-75 mix-blend-multiply saturate-125"
                  />
                  <div
                    className="absolute bottom-[6cqw] left-[6cqw] text-[clamp(3rem,12cqw,6rem)] font-black leading-none text-black/85"
                    style={{ fontFamily: fonts.display }}
                  >
                    L/01
                  </div>
                </div>
                <div className="flex flex-col justify-center px-[8%] py-[5%]">
                  <div
                    className="mb-6 font-mono text-[10px] uppercase tracking-[0.24em]"
                    style={{ color: accent }}
                  >
                    {sectionLabel(block, index)}
                  </div>
                  <p
                    className="text-balance text-[clamp(1.05rem,3.15cqw,2.2rem)] leading-[1.16]"
                    style={{ fontFamily: fonts.serif }}
                  >
                    “{block.content}”
                  </p>
                  <div className="mt-8 flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">
                    <span
                      className="border px-2 py-1"
                      style={{ borderColor: accent, color: accent }}
                    >
                      16:9 deck
                    </span>
                    <span className="border border-white/10 px-2 py-1">
                      Convex media
                    </span>
                    <span className="border border-white/10 px-2 py-1">
                      Live draft
                    </span>
                  </div>
                </div>
              </div>
            </BlockFrame>
          );
        }

        if (block.type === "world" || block.type === "tone") {
          const stills = referenceStills(referenceImages, index, 6);
          return (
            <BlockFrame
              key={block.id}
              block={block}
              index={index}
              selected={selected}
              editable={editable}
              onSelect={onSelectBlock}
            >
              <div className="flex h-full flex-col bg-black p-[4%]">
                <div className="mb-5 flex items-center gap-4">
                  <div
                    className="font-mono text-[10px] uppercase tracking-[0.24em]"
                    style={{ color: accent }}
                  >
                    {sectionLabel(block, index)}
                  </div>
                  <div className="h-px flex-1 bg-white/10" />
                  {paletteSwatches(colors).map((color) => (
                    <span
                      key={color}
                      className="h-3 w-3 border border-white/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div
                  className={cn(
                    "grid flex-1 gap-1.5",
                    dense ? "grid-cols-4" : "grid-cols-3",
                  )}
                >
                  {stills.map((src, stillIndex) => (
                    <div
                      key={stillIndex}
                      className={cn(
                        "relative overflow-hidden bg-[#111]",
                        stillIndex === 0 && dense
                          ? "col-span-2 row-span-2"
                          : "",
                      )}
                    >
                      <div className="aspect-video">
                        <CanvasImage src={src} className="saturate-[0.96]" />
                      </div>
                      <span className="absolute left-2 top-2 bg-black/55 px-1.5 py-0.5 font-mono text-[8px] tracking-[0.12em] text-white/70">
                        {String(stillIndex + 1).padStart(2, "0")}/06
                      </span>
                    </div>
                  ))}
                </div>
                <p
                  className="mt-4 max-w-[72cqw] text-[clamp(0.65rem,1.35cqw,0.9rem)] leading-relaxed"
                  style={{ color: muted }}
                >
                  {block.content}
                </p>
              </div>
            </BlockFrame>
          );
        }

        if (block.type === "character") {
          return (
            <BlockFrame
              key={block.id}
              block={block}
              index={index}
              selected={selected}
              editable={editable}
              onSelect={onSelectBlock}
            >
              <div className="grid h-full grid-cols-[0.9fr_1.25fr] items-center gap-[7%] bg-black px-[7%] py-[6%]">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#111]">
                  <CanvasImage src={img} className="grayscale contrast-110" />
                  <div className="absolute inset-0 bg-black/10" />
                </div>
                <div>
                  <div
                    className="mb-4 font-mono text-[10px] uppercase tracking-[0.24em]"
                    style={{ color: accent }}
                  >
                    {sectionLabel(block, index)}
                  </div>
                  <h2
                    className="text-[clamp(2.2rem,8cqw,5rem)] font-black uppercase leading-[0.88] tracking-[-0.06em]"
                    style={{ fontFamily: fonts.display }}
                  >
                    {block.title}
                  </h2>
                  <div
                    className="my-6 h-0.5 w-16"
                    style={{ backgroundColor: accent }}
                  />
                  <p className="max-w-[48cqw] text-[clamp(0.65rem,1.35cqw,0.9rem)] leading-relaxed text-white/72">
                    {block.content}
                  </p>
                </div>
              </div>
            </BlockFrame>
          );
        }

        if (block.type === "motif" || block.type === "story") {
          return (
            <BlockFrame
              key={block.id}
              block={block}
              index={index}
              selected={selected}
              editable={editable}
              onSelect={onSelectBlock}
            >
              <div className="grid h-full grid-cols-[0.9fr_1.4fr] items-center gap-[6%] bg-black px-[6%] py-[5%]">
                <div>
                  <div
                    className="mb-4 font-mono text-[10px] uppercase tracking-[0.24em]"
                    style={{ color: accent }}
                  >
                    {sectionLabel(block, index)}
                  </div>
                  <p
                    className="text-balance text-[clamp(1rem,3.4cqw,2.45rem)] leading-[1.16]"
                    style={{
                      fontFamily:
                        block.type === "story" ? fonts.serif : fonts.display,
                    }}
                  >
                    {block.content}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[img, next, third, fourth].map((src, stillIndex) => (
                    <div
                      key={stillIndex}
                      className="aspect-video overflow-hidden bg-[#111]"
                    >
                      <CanvasImage src={src} />
                    </div>
                  ))}
                </div>
              </div>
            </BlockFrame>
          );
        }

        if (block.type === "stakes" || block.type === "theme") {
          return (
            <BlockFrame
              key={block.id}
              block={block}
              index={index}
              selected={selected}
              editable={editable}
              onSelect={onSelectBlock}
            >
              <div className="relative flex h-full items-center justify-center bg-black px-[8%] py-[6%] text-center">
                <div
                  className="absolute left-1/2 top-8 h-12 w-px"
                  style={{ backgroundColor: accent }}
                />
                <div>
                  <div
                    className="mb-6 font-mono text-[10px] uppercase tracking-[0.3em]"
                    style={{ color: accent }}
                  >
                    {sectionLabel(block, index)}
                  </div>
                  <p
                    className="mx-auto max-w-[76cqw] text-balance text-[clamp(1.45rem,5.2cqw,3.8rem)] font-black uppercase leading-[1] tracking-[-0.04em]"
                    style={{ fontFamily: fonts.display }}
                  >
                    “{block.content}”
                  </p>
                </div>
              </div>
            </BlockFrame>
          );
        }

        if (block.type === "closing") {
          return (
            <BlockFrame
              key={block.id}
              block={block}
              index={index}
              selected={selected}
              editable={editable}
              onSelect={onSelectBlock}
            >
              <div className="relative flex h-full items-center justify-center overflow-hidden bg-black text-center">
                <CanvasImage
                  src={img}
                  className="absolute inset-0 opacity-45"
                />
                <div className="absolute inset-0 bg-black/62" />
                <div className="relative z-10 px-[6%]">
                  <h2
                    className="text-balance text-[clamp(2rem,7cqw,5rem)] font-black uppercase leading-[0.9] tracking-[-0.06em]"
                    style={{ fontFamily: fonts.display }}
                  >
                    {block.content}
                  </h2>
                  <div className="mt-8 font-mono text-[10px] uppercase tracking-[0.24em] text-white/55">
                    Pindeck studio
                  </div>
                </div>
              </div>
            </BlockFrame>
          );
        }

        return (
          <BlockFrame
            key={block.id}
            block={block}
            index={index}
            selected={selected}
            editable={editable}
            onSelect={onSelectBlock}
          >
            <div className="h-full bg-black px-[7%] py-[5%]">
              <div
                className="mb-4 font-mono text-[10px] uppercase tracking-[0.24em]"
                style={{ color: accent }}
              >
                {sectionLabel(block, index)}
              </div>
              <h2
                className="text-4xl font-bold uppercase"
                style={{ fontFamily: fonts.display }}
              >
                {block.title}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65">
                {block.content}
              </p>
            </div>
          </BlockFrame>
        );
      })}
    </div>
  );
}
