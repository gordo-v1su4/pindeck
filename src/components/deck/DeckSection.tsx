import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";
import type { BlockData, ColorPalette, FontStyle, LayoutVariant } from "./types";
import { cn } from "./utils/cn";

type DeckSectionProps = {
  block: BlockData;
  index: number;
  theme?: string;
  colors: ColorPalette;
  imageUrl: string | null;
  referenceImages: string[];
  imageIndex: number;
  fontStyle: FontStyle;
  layoutVariant: LayoutVariant;
  overlayOpacity?: number;
  overlayEnabled?: boolean;
  overlayDirection?: "top" | "bottom" | "left" | "right" | "radial";
  isEditing?: boolean;
  onUpdate?: (updated: BlockData) => void;
  dataGsap?: boolean;
};

type FitBox = {
  width?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;
};

const TYPOGRAPHY_STYLES: Record<
  FontStyle,
  {
    heroTitle: string;
    heading: string;
    subheading: string;
    body: string;
    label: string;
  }
> = {
  agency: {
    heroTitle:
      'font-["Schibsted_Grotesk",sans-serif] text-[21vw] leading-[0.85] uppercase tracking-normal font-bold',
    heading:
      'font-["Schibsted_Grotesk",sans-serif] text-[4vw] uppercase leading-[0.9] font-bold tracking-tight',
    subheading:
      'font-["Karla",sans-serif] text-[2vw] uppercase tracking-widest font-medium',
    body: 'font-["Karla",sans-serif] text-[1.1vw] font-medium leading-[1.6]',
    label:
      'font-["Schibsted_Grotesk",sans-serif] text-[0.9vw] uppercase tracking-[0.2em] font-bold',
  },
  "modern-clean": {
    heroTitle:
      'font-["Inter",sans-serif] text-[15vw] leading-none tracking-tighter font-thin uppercase',
    heading:
      'font-["Inter",sans-serif] text-[3.5vw] leading-[1.1] font-light tracking-tight',
    subheading: 'font-["Inter",sans-serif] text-[1.5vw] font-normal tracking-wide',
    body: 'font-["Inter",sans-serif] text-[1.1vw] font-light leading-[1.8]',
    label:
      'font-["Inter",sans-serif] text-[0.8vw] uppercase tracking-[0.1em] font-medium',
  },
  editorial: {
    heroTitle:
      'font-["Playfair_Display",serif] text-[18vw] leading-[0.9] italic font-black tracking-tighter',
    heading:
      'font-["Playfair_Display",serif] text-[4.5vw] leading-[1] font-bold',
    subheading:
      'font-["Source_Serif_4",serif] text-[1.2vw] uppercase tracking-[0.3em] font-light',
    body:
      'font-["Source_Serif_4",serif] text-[1.05vw] font-light leading-[1.8] text-justify',
    label: 'font-["Playfair_Display",serif] text-[0.9vw] italic font-bold tracking-wide',
  },
  brutalist: {
    heroTitle:
      'font-["Archivo_Black",sans-serif] text-[19.5vw] leading-[0.8] uppercase tracking-tighter',
    heading:
      'font-["Archivo_Black",sans-serif] text-[5vw] leading-[0.9] uppercase font-normal',
    subheading:
      'font-["Archivo",sans-serif] text-[1.8vw] font-bold tracking-tight bg-white text-black px-2',
    body:
      'font-["Archivo",sans-serif] text-[1.2vw] font-bold leading-[1.4] tracking-tight uppercase',
    label:
      'font-["Archivo_Black",sans-serif] text-[1vw] uppercase font-normal tracking-widest',
  },
  playful: {
    heroTitle:
      'font-["Quicksand",sans-serif] text-[24vw] leading-[0.6] font-bold tracking-tight',
    heading: 'font-["Quicksand",sans-serif] text-[7vw] leading-[0.8] font-bold',
    subheading:
      'font-["Cabin",sans-serif] text-[1.4vw] uppercase tracking-[0.1em] font-bold border-b-2 border-white/20 pb-1',
    body: 'font-["Cabin",sans-serif] text-[1.2vw] font-medium leading-[1.5]',
    label: 'font-["Quicksand",sans-serif] text-[2vw] font-bold opacity-80',
  },
  technical: {
    heroTitle:
      'font-["IBM_Plex_Sans",sans-serif] text-[18vw] leading-[0.8] font-light tracking-[-0.05em] uppercase',
    heading:
      'font-["IBM_Plex_Sans",sans-serif] text-[4vw] leading-[1] font-bold uppercase tracking-tight',
    subheading:
      'font-["IBM_Plex_Sans",sans-serif] text-[1.1vw] uppercase tracking-[0.4em] font-medium',
    body:
      'font-["IBM_Plex_Sans",sans-serif] text-[1vw] font-normal leading-[1.7] opacity-90',
    label:
      'font-["IBM_Plex_Sans",sans-serif] text-[0.8vw] uppercase font-bold tracking-[0.2em] border border-white/20 p-2',
  },
  newspaper: {
    heroTitle:
      'font-["Playfair_Display",serif] text-[18vw] leading-[0.9] font-bold tracking-tighter',
    heading:
      'font-["Playfair_Display",serif] text-[4.5vw] leading-[1] font-bold',
    subheading: 'font-["DM_Sans",sans-serif] text-[1.4vw] font-medium tracking-wide',
    body: 'font-["DM_Sans",sans-serif] text-[1.1vw] font-normal leading-[1.7]',
    label: 'font-["Playfair_Display",serif] text-[0.9vw] font-bold tracking-wide',
  },
  "ibm-plex": {
    heroTitle:
      'font-["IBM_Plex_Sans",sans-serif] text-[18vw] leading-[0.8] font-light tracking-[-0.05em] uppercase',
    heading:
      'font-["IBM_Plex_Sans",sans-serif] text-[4vw] leading-[1] font-bold uppercase tracking-tight',
    subheading:
      'font-["IBM_Plex_Sans",sans-serif] text-[1.1vw] uppercase tracking-[0.4em] font-medium',
    body:
      'font-["IBM_Plex_Sans",sans-serif] text-[1vw] font-normal leading-[1.7] opacity-90',
    label:
      'font-["IBM_Plex_Sans",sans-serif] text-[0.8vw] uppercase font-bold tracking-[0.2em] border border-white/20 p-2',
  },
  minimal: {
    heroTitle:
      'font-["Geist",sans-serif] text-[16.5vw] leading-none tracking-tighter font-medium uppercase',
    heading:
      'font-["Geist",sans-serif] text-[3.5vw] leading-[1.1] font-medium tracking-tight',
    subheading: 'font-["Geist",sans-serif] text-[1.4vw] font-normal tracking-wide',
    body: 'font-["Geist",sans-serif] text-[1.05vw] font-normal leading-[1.8]',
    label:
      'font-["Geist",sans-serif] text-[0.8vw] uppercase tracking-[0.15em] font-medium',
  },
};

function isDarkColor(color: string) {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return false;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

function parseFontSizeVw(className: string) {
  const match = className.match(/(?:!)?text-\[([\d.]+)vw\]/);
  return match ? Number.parseFloat(match[1]) : 4;
}

function HighlightText({
  text,
  color,
  textColor,
}: {
  text: string;
  color: string;
  textColor: string;
}) {
  return (
    <span
      className="inline-block rounded-sm px-[0.4em] py-[0.1em] box-decoration-clone"
      style={{ backgroundColor: color, color: textColor }}
    >
      {text}
    </span>
  );
}

function FitText({
  as = "div",
  className = "",
  style,
  children,
  box,
}: {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  box?: FitBox;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLElement | null>(null);
  const baseVw = parseFontSizeVw(className);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text || !box) return;

    const fit = () => {
      const maxW = container.clientWidth;
      const maxH = container.clientHeight;
      if (!maxW || !maxH) return;

      let scale = 1;
      const minScale = 0.35;
      const step = 0.03;

      text.style.fontSize = `${baseVw}vw`;

      while (scale >= minScale) {
        text.style.fontSize = `${baseVw * scale}vw`;
        if (text.scrollHeight <= maxH && text.scrollWidth <= maxW) break;
        scale -= step;
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [baseVw, box, children]);

  const Tag = as;
  if (!box) {
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  const containerStyle: CSSProperties = {
    overflow: "hidden",
    width: box.width ?? box.maxWidth ?? "100%",
    height: box.height ?? box.maxHeight,
    maxWidth: box.maxWidth,
    maxHeight: box.maxHeight,
  };

  return (
    <div ref={containerRef} className="flex min-w-0 flex-col" style={containerStyle}>
      <Tag
        ref={(node: HTMLElement | null) => {
          textRef.current = node;
        }}
        className={className}
        style={{ ...style, flexShrink: 0 }}
      >
        {children}
      </Tag>
    </div>
  );
}

function getTypographyClasses(fontStyle: FontStyle) {
  return TYPOGRAPHY_STYLES[fontStyle] ?? TYPOGRAPHY_STYLES.agency;
}

function normalizeType(block: BlockData) {
  switch (block.type) {
    case "hero":
      return "hero";
    case "logline":
      return "text";
    case "story":
      return "split";
    case "world":
      return "card";
    case "character":
      return "featured";
    case "tone":
      return "moodboard";
    case "motif":
      return "gallery";
    case "theme":
      return "statement";
    case "stakes":
      return "impact";
    case "closing":
      return "final";
    default:
      return "text";
  }
}

function getBlockSubtitle(block: BlockData, index: number) {
  switch (block.type) {
    case "hero":
      return "Deck opening statement";
    case "logline":
      return "Project logline and central premise overview.";
    case "story":
      return "Narrative spine";
    case "world":
      return "Expanded visual world";
    case "character":
      return "Character study";
    case "tone":
      return "Mood calibration";
    case "motif":
      return "Repeated visual language";
    case "theme":
      return "Core idea";
    case "stakes":
      return "What failure costs";
    case "closing":
      return "Pitchcraft studios";
    default:
      return `Section ${index + 1}`;
  }
}

function getRotatingImages(referenceImages: string[], imageIndex: number, fallback: string | null) {
  if (referenceImages.length === 0) {
    return fallback ? [fallback] : [];
  }

  return Array.from({ length: Math.min(4, referenceImages.length) }, (_, offset) => {
    return referenceImages[(imageIndex + offset) % referenceImages.length];
  }).filter(Boolean);
}

function ImageFrame({
  src,
  alt,
  className,
  overlayEnabled,
  overlayOpacity,
  overlayDirection = "bottom",
  overlayClassName,
  imageClassName,
  grayscale = false,
}: {
  src?: string | null;
  alt: string;
  className: string;
  overlayEnabled?: boolean;
  overlayOpacity?: number;
  overlayDirection?: "top" | "bottom" | "left" | "right" | "radial";
  overlayClassName?: string;
  imageClassName?: string;
  grayscale?: boolean;
}) {
  const overlayBackground =
    overlayDirection === "top"
      ? `linear-gradient(to top, rgba(0,0,0,${Math.min((overlayOpacity ?? 0) / 100, 0.92)}) 0%, rgba(0,0,0,0) 68%)`
      : overlayDirection === "left"
        ? `linear-gradient(to left, rgba(0,0,0,${Math.min((overlayOpacity ?? 0) / 100, 0.92)}) 0%, rgba(0,0,0,0) 68%)`
        : overlayDirection === "right"
          ? `linear-gradient(to right, rgba(0,0,0,${Math.min((overlayOpacity ?? 0) / 100, 0.92)}) 0%, rgba(0,0,0,0) 68%)`
          : overlayDirection === "radial"
            ? `radial-gradient(circle at center, rgba(0,0,0,0) 22%, rgba(0,0,0,${Math.min((overlayOpacity ?? 0) / 100, 0.92)}) 100%)`
            : `linear-gradient(to bottom, rgba(0,0,0,${Math.min((overlayOpacity ?? 0) / 100, 0.92)}) 0%, rgba(0,0,0,0) 68%)`;

  return (
    <div className={className}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn("h-full w-full object-cover", grayscale && "grayscale", imageClassName)}
        />
      ) : (
        <div className="h-full w-full bg-[#111]" />
      )}
      {src && overlayEnabled && (overlayOpacity ?? 0) > 0 ? (
        <div
          className={cn("absolute inset-0", overlayClassName)}
          style={{ background: overlayBackground }}
        />
      ) : null}
    </div>
  );
}

export function DeckSection({
  block,
  index,
  colors,
  imageUrl,
  referenceImages,
  imageIndex,
  fontStyle,
  layoutVariant,
  overlayOpacity = 0,
  overlayEnabled = false,
  overlayDirection = "bottom",
  dataGsap = false,
}: DeckSectionProps) {
  const fonts = getTypographyClasses(fontStyle);
  const blockType = normalizeType(block);
  const supplementalImages = useMemo(
    () => getRotatingImages(referenceImages, imageIndex, imageUrl),
    [imageIndex, imageUrl, referenceImages]
  );
  const mainImg = supplementalImages[0] ?? imageUrl ?? "";
  const isDarkAccent = isDarkColor(colors.accent);
  const accentText = isDarkAccent ? "#fff" : "#050505";

  const renderLayoutA = () => {
    switch (blockType) {
      case "hero":
        return (
          <div className="relative flex h-[56.25vw] w-full flex-col justify-end overflow-hidden bg-[#050505]">
            <ImageFrame
              src={mainImg}
              alt={block.title}
              className="absolute inset-0 h-full w-full"
              imageClassName="object-top opacity-80"
              overlayEnabled={overlayEnabled}
              overlayOpacity={overlayOpacity}
              overlayDirection={overlayDirection}
              overlayClassName="bg-gradient-to-t from-[#050505] via-transparent to-transparent"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
            <div className="relative z-10 flex items-end justify-between px-[6vw] pb-[4vw]">
              <FitText
                as="h1"
                className={cn(fonts.heroTitle, "translate-y-[2vw] drop-shadow-2xl")}
                style={{ color: colors.text }}
                box={{ maxWidth: "42vw", maxHeight: "21vw" }}
              >
                {block.title}
              </FitText>
              <div className="flex max-w-[30vw] flex-col gap-[1vw] text-right">
                <FitText
                  as="p"
                  className={fonts.subheading}
                  style={{ color: colors.accent }}
                  box={{ maxWidth: "30vw", maxHeight: "3.5vw" }}
                >
                  {getBlockSubtitle(block, index)}
                </FitText>
                <FitText
                  as="p"
                  className={fonts.body}
                  style={{ color: colors.text, opacity: 0.9 }}
                  box={{ maxWidth: "30vw", maxHeight: "8vw" }}
                >
                  {block.content}
                </FitText>
              </div>
            </div>
          </div>
        );
      case "text":
        return (
          <div className="flex h-[56.25vw] w-full items-center bg-[#050505] px-[10vw]">
            <div className="grid w-full grid-cols-[1fr_1.5fr] items-center gap-[8vw]">
              <div className="flex flex-col">
                <FitText
                  as="span"
                  className={cn(fonts.label, "mb-[2vw] block")}
                  style={{ color: colors.tertiary }}
                  box={{ maxWidth: "25vw", maxHeight: "2vw" }}
                >
                  {block.title}
                </FitText>
                <div className="mb-[2vw] h-px w-[3vw]" style={{ backgroundColor: colors.tertiary }} />
                <FitText
                  as="p"
                  className={fonts.body}
                  style={{ color: colors.muted }}
                  box={{ maxWidth: "25vw", maxHeight: "6vw" }}
                >
                  {getBlockSubtitle(block, index)}
                </FitText>
              </div>
              <FitText
                as="h2"
                className={cn(fonts.heading, "leading-tight")}
                style={{ color: colors.text }}
                box={{ maxWidth: "45vw", maxHeight: "18vw" }}
              >
                {block.content}
              </FitText>
            </div>
          </div>
        );
      case "split":
        return (
          <div className="flex h-[56.25vw] w-full items-center justify-between overflow-hidden bg-[#050505]">
            <div className="relative z-10 flex w-[45%] flex-col gap-[2vw] pl-[8vw] pr-[4vw]">
              <FitText
                as="span"
                className={cn(fonts.label, "block")}
                style={{ color: colors.tertiary }}
                box={{ maxWidth: "20vw", maxHeight: "2vw" }}
              >
                {block.title}
              </FitText>
              <FitText
                as="p"
                className={fonts.body}
                style={{ color: colors.text, opacity: 0.9 }}
                box={{ maxWidth: "35vw", maxHeight: "12vw" }}
              >
                {block.content}
              </FitText>
            </div>
            <div className="relative mr-[4vw] h-[40vw] w-[65%]">
              <ImageFrame
                src={mainImg}
                alt={block.title}
                className="relative h-full w-full"
                overlayEnabled={overlayEnabled}
                overlayOpacity={overlayOpacity}
                overlayDirection={overlayDirection}
              />
              <div className="absolute bottom-[-2vw] left-[-4vw] bg-[#050505] p-[2vw]">
                <FitText
                  as="h2"
                  className={fonts.heading}
                  style={{ color: colors.text }}
                  box={{ maxWidth: "15vw", maxHeight: "4vw" }}
                >
                  SYNOPSIS
                </FitText>
              </div>
            </div>
          </div>
        );
      case "card":
        return (
          <div className="flex h-[56.25vw] w-full flex-col justify-center bg-[#050505] px-[8vw]">
            <FitText
              as="h2"
              className={cn(fonts.heading, "mb-[4vw] text-center")}
              style={{ color: colors.text }}
              box={{ maxWidth: "50vw", maxHeight: "6vw" }}
            >
              {block.title}
            </FitText>
            <div className="grid grid-cols-3 gap-[2vw]">
              {[0, 1, 2].map((itemIndex) => (
                <div key={itemIndex} className="flex flex-col gap-[1.5vw]">
                  <div className="aspect-[4/3] overflow-hidden bg-[#111]">
                    <ImageFrame
                      src={supplementalImages[itemIndex] ?? mainImg}
                      alt={`${block.title} ${itemIndex + 1}`}
                      className="relative h-full w-full"
                      imageClassName="opacity-70"
                      overlayEnabled={overlayEnabled}
                      overlayOpacity={overlayOpacity}
                      overlayDirection={overlayDirection}
                    />
                  </div>
                  <FitText
                    as="p"
                    className={fonts.body}
                    style={{ color: colors.text, opacity: 0.85 }}
                    box={{ maxWidth: "100%", maxHeight: "5vw" }}
                  >
                    {itemIndex === 0
                      ? block.content
                      : "An expansive world with distinct visual rules and cinematic tone."}
                  </FitText>
                </div>
              ))}
            </div>
          </div>
        );
      case "featured":
        return (
          <div className="flex h-[56.25vw] w-full items-center gap-[6vw] bg-[#050505] px-[8vw]">
            <ImageFrame
              src={mainImg}
              alt={block.title}
              className="relative h-[45vw] w-[40%] overflow-hidden bg-[#111]"
              imageClassName="opacity-90"
              grayscale
              overlayEnabled={overlayEnabled}
              overlayOpacity={overlayOpacity}
              overlayDirection={overlayDirection}
            />
            <div className="flex w-[50%] flex-col gap-[1vw]">
              <FitText
                as="span"
                className={cn(fonts.label, "block")}
                style={{ color: colors.tertiary }}
                box={{ maxWidth: "15vw", maxHeight: "2vw" }}
              >
                CHARACTER
              </FitText>
              <FitText
                as="h2"
                className={fonts.heroTitle}
                style={{ color: colors.text }}
                box={{ maxWidth: "30vw", maxHeight: "8vw" }}
              >
                {block.title}
              </FitText>
              <div className="h-[2px] w-[4vw]" style={{ backgroundColor: colors.accent }} />
              <FitText
                as="p"
                className={fonts.body}
                style={{ color: colors.text, opacity: 0.9 }}
                box={{ maxWidth: "30vw", maxHeight: "8vw" }}
              >
                {block.content}
              </FitText>
            </div>
          </div>
        );
      case "moodboard":
      case "gallery":
        return (
          <div className="flex h-[56.25vw] w-full flex-col justify-center bg-[#050505] px-[8vw]">
            <div className="mb-[3vw] flex items-end justify-between">
              <FitText
                as="h2"
                className={fonts.heading}
                style={{ color: colors.text }}
                box={{ maxWidth: "25vw", maxHeight: "5vw" }}
              >
                {block.title}
              </FitText>
              <FitText
                as="p"
                className={cn(fonts.body, "text-right")}
                style={{ color: colors.muted }}
                box={{ maxWidth: "25vw", maxHeight: "6vw" }}
              >
                {block.content}
              </FitText>
            </div>
            <div className="grid h-[30vw] grid-cols-4 gap-[1vw]">
              <div className="col-span-2 row-span-2 overflow-hidden bg-[#111]">
                <ImageFrame
                  src={supplementalImages[0] ?? mainImg}
                  alt={block.title}
                  className="relative h-full w-full"
                  overlayEnabled={overlayEnabled}
                  overlayOpacity={overlayOpacity}
                  overlayDirection={overlayDirection}
                />
              </div>
              <div className="overflow-hidden bg-[#1a1a1a]">
                <ImageFrame
                  src={supplementalImages[1]}
                  alt={`${block.title} detail`}
                  className="relative h-full w-full"
                  overlayEnabled={overlayEnabled}
                  overlayOpacity={overlayOpacity}
                  overlayDirection={overlayDirection}
                />
              </div>
              <div className="row-span-2 overflow-hidden bg-[#222]">
                <ImageFrame
                  src={supplementalImages[2]}
                  alt={`${block.title} alternate`}
                  className="relative h-full w-full"
                  overlayEnabled={overlayEnabled}
                  overlayOpacity={overlayOpacity}
                  overlayDirection={overlayDirection}
                />
              </div>
              <div className="overflow-hidden bg-[#151515]">
                <ImageFrame
                  src={supplementalImages[3]}
                  alt={`${block.title} close`}
                  className="relative h-full w-full"
                  overlayEnabled={overlayEnabled}
                  overlayOpacity={overlayOpacity}
                />
              </div>
            </div>
          </div>
        );
      case "statement":
      case "impact":
        return (
          <div className="flex h-[56.25vw] w-full flex-col items-center justify-center bg-[#050505] px-[15vw] text-center">
            <FitText
              as="span"
              className={cn(fonts.label, "mb-[3vw] tracking-[0.5em]")}
              style={{ color: colors.tertiary }}
              box={{ maxWidth: "30vw", maxHeight: "2vw" }}
            >
              {block.title}
            </FitText>
            <FitText
              as="h2"
              className={cn(fonts.heading, "leading-[1.1]")}
              style={{ color: colors.text }}
              box={{ maxWidth: "70vw", maxHeight: "18vw" }}
            >
              "{block.content}"
            </FitText>
            <div className="mt-[4vw] h-[6vw] w-px" style={{ backgroundColor: colors.tertiary }} />
          </div>
        );
      case "final":
        return (
          <div className="relative flex h-[56.25vw] w-full items-center justify-center overflow-hidden bg-[#050505]">
            <ImageFrame
              src={mainImg}
              alt={block.title}
              className="absolute inset-0 h-full w-full"
              imageClassName="opacity-40"
              overlayEnabled={overlayEnabled}
              overlayOpacity={overlayOpacity}
              overlayDirection={overlayDirection}
            />
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative z-10 flex flex-col items-center gap-[2vw] text-center">
              <FitText
                as="h2"
                className={cn(fonts.heroTitle, "drop-shadow-2xl")}
                style={{ color: colors.text }}
                box={{ maxWidth: "80vw", maxHeight: "14vw" }}
              >
                {block.content}
              </FitText>
              <FitText
                as="p"
                className={cn(fonts.label, "drop-shadow-lg")}
                style={{ color: colors.muted }}
                box={{ maxWidth: "50vw", maxHeight: "3vw" }}
              >
                {getBlockSubtitle(block, index)}
              </FitText>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderLayoutB = () => {
    const bgColor = "#181912";

    switch (blockType) {
      case "hero":
        return (
          <div className="relative flex h-[56.25vw] w-full flex-col p-[2vw]" style={{ backgroundColor: bgColor }}>
            <div className="absolute right-[1vw] top-[4vw] bottom-[4vw] flex w-[3vw] items-center justify-center border-l border-white/20">
              <span className={cn(fonts.label, "-rotate-90 whitespace-nowrap")} style={{ color: colors.muted }}>
                PITCHCRAFT STUDIOS
              </span>
            </div>
            <div className="mb-[2vw] flex-1 overflow-hidden border border-white/10 bg-[#111]">
              <ImageFrame
                src={mainImg}
                alt={block.title}
                className="relative h-full w-[90%]"
                imageClassName="opacity-80"
                overlayEnabled={overlayEnabled}
                overlayOpacity={overlayOpacity}
                overlayDirection={overlayDirection}
              />
            </div>
            <div className="flex w-[90%] justify-center pb-[2vw]">
              <FitText
                as="h1"
                className={fonts.heroTitle}
                style={{ color: colors.accent }}
                box={{ maxWidth: "68vw", maxHeight: "14vw" }}
              >
                {block.title}
              </FitText>
            </div>
          </div>
        );
      case "text":
      case "split":
        return (
          <div className="relative grid h-[56.25vw] w-full grid-cols-2 gap-[2vw] p-[3vw]" style={{ backgroundColor: bgColor }}>
            <div className="absolute right-[1vw] top-[4vw] bottom-[4vw] flex w-[3vw] items-center justify-center">
              <span className={cn(fonts.label, "-rotate-90 whitespace-nowrap")} style={{ color: colors.muted }}>
                FILM PROPOSAL
              </span>
            </div>
            <div className="relative flex h-full w-[95%] flex-col overflow-hidden border-[0.2vw] border-white/10 bg-[#111] p-[2vw]">
              <ImageFrame
                src={mainImg}
                alt={block.title}
                className="absolute inset-0 h-full w-full"
                imageClassName="opacity-40"
                overlayEnabled={overlayEnabled}
                overlayOpacity={overlayOpacity}
                overlayDirection={overlayDirection}
              />
              <div className="relative z-10">
                <FitText
                  as="h2"
                  className={cn(fonts.heading, "mb-[2vw]")}
                  style={{ color: colors.text }}
                  box={{ maxWidth: "26vw", maxHeight: "6vw" }}
                >
                  <HighlightText text={block.title} color={colors.accent} textColor={accentText} />
                </FitText>
                <div className={cn(fonts.body, "w-[80%] leading-[2]")}>
                  <HighlightText
                    text={block.content}
                    color="rgba(255,255,255,0.9)"
                    textColor="#000"
                  />
                </div>
              </div>
            </div>
            <div className="flex h-full w-[95%] flex-col justify-end border-[0.2vw] border-white/10 bg-[#0a0a0a] p-[3vw]">
              <FitText
                as="h2"
                className={cn(fonts.heading, "mb-[2vw] text-right")}
                style={{ color: colors.text }}
                box={{ maxWidth: "22vw", maxHeight: "5vw" }}
              >
                {blockType === "split" ? "SYNOPSIS" : "PREMISE"}
              </FitText>
              <FitText
                as="p"
                className={cn(fonts.body, "text-right")}
                style={{ color: colors.muted }}
                box={{ maxWidth: "24vw", maxHeight: "12vw" }}
              >
                {block.content}
              </FitText>
            </div>
          </div>
        );
      case "card":
      case "featured":
        return (
          <div className="relative h-[56.25vw] w-full p-[3vw]" style={{ backgroundColor: bgColor }}>
            <div className="absolute left-[1vw] top-[4vw] bottom-[4vw] flex w-[3vw] items-center justify-center">
              <span className={cn(fonts.label, "-rotate-90 whitespace-nowrap")} style={{ color: colors.muted }}>
                PITCHCRAFT STUDIOS
              </span>
            </div>
            <div className="mx-auto grid h-full w-[90%] grid-cols-[1fr_2fr] gap-[2vw]">
              <div className="flex h-full flex-col justify-end">
                <FitText
                  as="h2"
                  className={cn(fonts.heading, "mb-[1vw]")}
                  style={{ color: colors.text }}
                  box={{ maxWidth: "24vw", maxHeight: "6vw" }}
                >
                  <HighlightText text={block.title} color="rgba(255,255,255,0.9)" textColor="#000" />
                </FitText>
                <FitText
                  as="p"
                  className={cn(fonts.body, "border border-white/10 bg-black/50 p-[1.5vw]")}
                  style={{ color: colors.text }}
                  box={{ maxWidth: "100%", maxHeight: "12vw" }}
                >
                  {block.content}
                </FitText>
              </div>
              <div className="relative h-full overflow-hidden border-[0.2vw] border-white/10 bg-[#111]">
                <ImageFrame
                  src={mainImg}
                  alt={block.title}
                  className="relative h-full w-full"
                  imageClassName="opacity-70"
                  overlayEnabled={overlayEnabled}
                  overlayOpacity={overlayOpacity}
                  overlayDirection={overlayDirection}
                />
                {blockType === "featured" ? (
                  <div className="absolute bottom-[2vw] left-[2vw]">
                    <FitText
                      as="h2"
                      className={cn(fonts.heroTitle, "drop-shadow-lg")}
                      style={{ color: colors.text }}
                      box={{ maxWidth: "32vw", maxHeight: "10vw" }}
                    >
                      {block.title}
                    </FitText>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      case "moodboard":
      case "gallery":
        return (
          <div className="relative flex h-[56.25vw] w-full flex-col p-[3vw]" style={{ backgroundColor: bgColor }}>
            <div className="absolute right-[1vw] top-[4vw] bottom-[4vw] flex w-[3vw] items-center justify-center">
              <span className={cn(fonts.label, "-rotate-90 whitespace-nowrap")} style={{ color: colors.muted }}>
                VISUAL MOOD
              </span>
            </div>
            <div className="grid h-full w-[95%] grid-cols-3 grid-rows-2 gap-[1.5vw]">
              <div className="relative border-[0.2vw] border-white/10 bg-[#111]">
                <ImageFrame
                  src={supplementalImages[0] ?? mainImg}
                  alt={block.title}
                  className="relative h-full w-full"
                  overlayEnabled={overlayEnabled}
                  overlayOpacity={overlayOpacity}
                  overlayDirection={overlayDirection}
                />
              </div>
              <div className="relative row-span-2 flex items-center justify-center overflow-hidden border-[0.2vw] border-white/10 bg-[#1a1a1a]">
                <ImageFrame
                  src={supplementalImages[1]}
                  alt={`${block.title} panel`}
                  className="absolute inset-0 h-full w-full"
                  imageClassName="opacity-50"
                  overlayEnabled={overlayEnabled}
                  overlayOpacity={overlayOpacity}
                  overlayDirection={overlayDirection}
                />
                <FitText
                  as="h2"
                  className={cn(fonts.heading, "relative z-10 text-center")}
                  box={{ maxWidth: "20vw", maxHeight: "8vw" }}
                >
                  <HighlightText text={block.title} color={colors.accent} textColor={accentText} />
                </FitText>
              </div>
              <div className="flex items-center border-[0.2vw] border-white/10 bg-[#111] p-[2vw]">
                <FitText
                  as="p"
                  className={cn(fonts.body, "leading-[1.8]")}
                  style={{ color: colors.text }}
                  box={{ maxWidth: "100%", maxHeight: "10vw" }}
                >
                  <HighlightText
                    text={block.content}
                    color="rgba(0,0,0,0.8)"
                    textColor={colors.text}
                  />
                </FitText>
              </div>
              <div className="relative col-span-2 border-[0.2vw] border-white/10 bg-[#222]">
                <ImageFrame
                  src={supplementalImages[2] ?? mainImg}
                  alt={`${block.title} wide`}
                  className="relative h-full w-full"
                  overlayEnabled={overlayEnabled}
                  overlayOpacity={overlayOpacity}
                  overlayDirection={overlayDirection}
                />
              </div>
            </div>
          </div>
        );
      case "statement":
      case "impact":
        return (
          <div className="relative flex h-[56.25vw] w-full items-center justify-center p-[3vw]" style={{ backgroundColor: bgColor }}>
            <div
              className="w-[80%] border-[0.3vw] bg-[#0a0a0b] p-[4vw]"
              style={{ borderColor: colors.tertiary }}
            >
              <span className={cn(fonts.label, "mb-[2vw] block")} style={{ color: colors.tertiary }}>
                {block.title}
              </span>
              <FitText
                as="h2"
                className={cn(fonts.heading, "leading-tight")}
                style={{ color: colors.text }}
                box={{ maxWidth: "64vw", maxHeight: "16vw" }}
              >
                <HighlightText
                  text={`"${block.content}"`}
                  color="transparent"
                  textColor={colors.text}
                />
              </FitText>
            </div>
          </div>
        );
      case "final":
        return (
          <div
            className="relative flex h-[56.25vw] w-full items-center justify-center overflow-hidden border-[1vw]"
            style={{ backgroundColor: bgColor, borderColor: bgColor }}
          >
            <ImageFrame
              src={mainImg}
              alt={block.title}
              className="absolute inset-0 h-full w-full"
              imageClassName="opacity-60"
              overlayEnabled={overlayEnabled}
              overlayOpacity={overlayOpacity}
              overlayDirection={overlayDirection}
            />
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative z-10 border-[0.2vw] bg-black/80 p-[4vw] text-center"
              style={{ borderColor: colors.tertiary }}
            >
              <FitText
                as="h2"
                className={cn(fonts.heading, "mb-[1vw]")}
                box={{ maxWidth: "56vw", maxHeight: "10vw" }}
              >
                <HighlightText text={block.content} color={colors.accent} textColor={accentText} />
              </FitText>
              <FitText
                as="p"
                className={fonts.label}
                style={{ color: colors.tertiary }}
                box={{ maxWidth: "32vw", maxHeight: "3vw" }}
              >
                {getBlockSubtitle(block, index)}
              </FitText>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (block.type === "divider") {
    return (
      <section className="bg-[#050505] px-[6vw] py-[4vw]">
        <div className="h-px w-full bg-white/10" />
      </section>
    );
  }

  return (
    <section
      data-gsap={dataGsap ? "section" : undefined}
      className="relative overflow-hidden bg-black"
    >
      {layoutVariant === "editorial" ? renderLayoutA() : renderLayoutB()}
    </section>
  );
}
