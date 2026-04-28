import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  DragHandleDots2Icon,
  EyeNoneIcon,
  EyeOpenIcon,
  LockClosedIcon,
  LockOpen1Icon,
} from "@radix-ui/react-icons";
import { Button, Select } from "@radix-ui/themes";
import { toast } from "sonner";
import { DeckCanvasPage } from "./DeckCanvasPage";
import { DeckSection } from "./DeckSection";
import type {
  BlockData,
  ColorPalette,
  FontStyle,
  LayoutVariant,
  StyleVariant,
} from "./types";
import { cn } from "./utils/cn";
import { FIELD_CLASS } from "@/components/ui/actionStyles";
import {
  defaultColors,
  extractColors,
  paletteFromDominantHexes,
} from "./utils/colorExtractor";
import type { Id } from "../../../convex/_generated/dataModel";

type DeckSlide = {
  imageId: Id<"images">;
  layout: string;
  order: number;
  image: {
    _id: Id<"images">;
    title: string;
    imageUrl: string;
    description?: string;
    tags: string[];
    category: string;
    sref?: string;
    source?: string;
    /** Dominant palette from `images.colors` (same ordering as extraction). */
    colors?: string[];
  } | null;
};

export type DeckDetail = {
  _id: Id<"decks">;
  title: string;
  boardName?: string | null;
  createdAt: number;
  slides: DeckSlide[];
};

type ScrollFx = "parallax" | "snap" | "kinetic" | "dolly" | "sequence";

type ColorPickerInput = HTMLInputElement & {
  showPicker?: () => void;
};

const FONT_OPTIONS: Array<{
  id: FontStyle;
  name: string;
  detail: string;
  preview: string;
  previewFamily: string;
}> = [
  {
    id: "agency",
    name: "Agency",
    detail: "Schibsted Grotesk + Karla",
    preview: "AG",
    previewFamily: '"Schibsted Grotesk", sans-serif',
  },
  {
    id: "technical",
    name: "Technical",
    detail: "IBM Plex Sans + Mono",
    preview: "PX",
    previewFamily: '"IBM Plex Sans", sans-serif',
  },
  {
    id: "editorial",
    name: "Editorial",
    detail: "Playfair + Source Serif",
    preview: "Ed",
    previewFamily: '"Playfair Display", serif',
  },
  {
    id: "brutalist",
    name: "Brutalist",
    detail: "Archivo Black + Archivo",
    preview: "BR",
    previewFamily: '"Archivo Black", sans-serif',
  },
  {
    id: "playful",
    name: "Playful",
    detail: "Quicksand + Cabin",
    preview: "Qk",
    previewFamily: '"Quicksand", sans-serif',
  },
  {
    id: "modern-clean",
    name: "Modern",
    detail: "Inter slim system",
    preview: "MC",
    previewFamily: '"Inter", sans-serif',
  },
  {
    id: "newspaper",
    name: "Newspaper",
    detail: "Playfair + DM Sans",
    preview: "NP",
    previewFamily: '"Playfair Display", serif',
  },
  {
    id: "ibm-plex",
    name: "IBM Plex",
    detail: "Plex Sans + Plex Mono",
    preview: "IP",
    previewFamily: '"IBM Plex Sans", sans-serif',
  },
  {
    id: "minimal",
    name: "Minimal",
    detail: "Geist clean stack",
    preview: "Mi",
    previewFamily: '"Geist", sans-serif',
  },
];

const LAYOUT_OPTIONS: Array<{
  id: LayoutVariant;
  name: string;
  short: string;
  detail: string;
}> = [
  {
    id: "editorial",
    name: "Layout A",
    short: "A",
    detail: "Wide frames, cinematic pacing, strong hero moments.",
  },
  {
    id: "collage",
    name: "Layout B",
    short: "B",
    detail: "Dense composition, modular cards, stronger image rhythm.",
  },
];

const STYLE_OPTIONS: Array<{
  id: StyleVariant;
  label: string;
  topLabel: string;
  detail: string;
}> = [
  {
    id: "cinematic",
    label: "CINEMA",
    topLabel: "CINEMATIC TREATMENT",
    detail: "Moody widescreen. Full-bleed stills, letterboxed type.",
  },
  {
    id: "minimal",
    label: "EDITOR",
    topLabel: "EDITORIAL / NO.12",
    detail: "Editorial rhythm with quieter contrast and cleaner type.",
  },
  {
    id: "neon",
    label: "MV",
    topLabel: "MUSIC VIDEO",
    detail: "High-contrast neon treatment with louder color tension.",
  },
  {
    id: "bold",
    label: "COMM",
    topLabel: "COMMERCIAL BOARD",
    detail: "Commercial-forward contrast with stronger action graphics.",
  },
  {
    id: "noir",
    label: "ARCH",
    topLabel: "ARCHIVAL REFERENCE",
    detail: "Archival contrast with restrained texture and darker mood.",
  },
];

const SCROLL_FX_OPTIONS: Array<{
  id: ScrollFx;
  label: string;
}> = [
  { id: "parallax", label: "PARALLAX" },
  { id: "snap", label: "SNAP" },
  { id: "kinetic", label: "KINETIC" },
  { id: "dolly", label: "DOLLY" },
  { id: "sequence", label: "FRAME" },
];

const STORAGE_VERSION = 4;
const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&family=Karla:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Source+Serif+4:wght@300;400;600;700&family=Archivo:wght@400;600;700&family=Archivo+Black&family=Quicksand:wght@400;500;600;700&family=Cabin:wght@400;500;600;700&family=Inter:wght@300;400;500;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap";

const templateBlocks: BlockData[] = [
  {
    id: "1",
    type: "hero",
    title: "PROJECT TITLE",
    content: "A cinematic visual proposition.",
    layout: "A",
    visible: true,
    locked: true,
  },
  {
    id: "2",
    type: "logline",
    title: "LOGLINE",
    content:
      "A one-breath summary that makes the image set land as a single, felt idea.",
    layout: "A",
    visible: true,
    locked: false,
  },
  {
    id: "3",
    type: "story",
    title: "STORY",
    content:
      "A progression from setup to escalation to release, framed with visual clarity and emotional lift.",
    layout: "A",
    visible: true,
    locked: false,
  },
  {
    id: "4",
    type: "world",
    title: "WORLD & CONCEPT",
    content:
      "Production design, setting logic, and tonal references all anchored in the selected image language.",
    layout: "A",
    visible: true,
    locked: false,
  },
  {
    id: "5",
    type: "character",
    title: "CHARACTER",
    content:
      "A lead presence shaped by silhouette, attitude, costume, and emotional tension.",
    layout: "A",
    visible: true,
    locked: false,
  },
  {
    id: "6",
    type: "tone",
    title: "TONE & STYLE",
    content:
      "The deck should broadcast how it feels before anyone reads a paragraph.",
    layout: "A",
    visible: true,
    locked: false,
  },
  {
    id: "7",
    type: "motif",
    title: "VISUAL MOTIFS",
    content:
      "Repeatable shapes, materials, and lighting signatures that give the deck continuity.",
    layout: "A",
    visible: true,
    locked: false,
  },
  {
    id: "8",
    type: "theme",
    title: "THEMES",
    content: "Identity, consequence, transformation, obsession.",
    layout: "A",
    visible: false,
    locked: false,
  },
  {
    id: "9",
    type: "stakes",
    title: "STAKES",
    content:
      "If the central figure fails, the fallout grows from private collapse to a wider public impact.",
    layout: "A",
    visible: true,
    locked: false,
  },
  {
    id: "10",
    type: "closing",
    title: "CLOSING",
    content:
      "A final image and phrase that leaves the room wanting the next page.",
    layout: "A",
    visible: true,
    locked: false,
  },
];

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

function buildPalette(partial: Partial<ColorPalette>): ColorPalette {
  return withAliases(partial);
}

const stylePresets: Record<StyleVariant, ColorPalette> = {
  cinematic: buildPalette({
    primary: "#d2dc64",
    secondary: "#334135",
    accent: "#fff5a6",
    tertiary: "#8ea871",
    background: "#08090b",
    surface: "#13161a",
    text: "#eef3df",
    muted: "#bac2aa",
    border: "#5a6e4c",
  }),
  bold: buildPalette({
    primary: "#ff5c58",
    secondary: "#1f273d",
    accent: "#ffd166",
    tertiary: "#38b2ac",
    background: "#0a0b11",
    surface: "#171923",
    text: "#f8f6f0",
    muted: "#c1c4cf",
    border: "#8e93a6",
  }),
  minimal: buildPalette({
    primary: "#c2c7cf",
    secondary: "#757b84",
    accent: "#f2f4f5",
    tertiary: "#9ea7b2",
    background: "#090a0c",
    surface: "#12151a",
    text: "#f5f6f8",
    muted: "#b5bbc5",
    border: "#505863",
  }),
  noir: buildPalette({
    primary: "#8c8c8c",
    secondary: "#343434",
    accent: "#d5b45c",
    tertiary: "#7a6852",
    background: "#050505",
    surface: "#111111",
    text: "#f3efe6",
    muted: "#beb7ab",
    border: "#5d5346",
  }),
  neon: buildPalette({
    primary: "#00d9ff",
    secondary: "#5b4bff",
    accent: "#ff4fd8",
    tertiary: "#7dff67",
    background: "#070414",
    surface: "#130b26",
    text: "#faf9ff",
    muted: "#bdb6da",
    border: "#473c84",
  }),
};

function buildDeckBlocks(
  deckTitle: string,
  imageTitles: string[],
): BlockData[] {
  const [a, b, c, d, e, f, g, h, i, j] = imageTitles;

  return templateBlocks.map((block) => {
    if (block.type === "hero") {
      return {
        ...block,
        title: deckTitle || "UNTITLED DECK",
        content: a
          ? `Built from the visual DNA of "${a}" and expanded into a tighter deck read.`
          : "Built from your selected board imagery and tuned for presentation flow.",
      };
    }

    if (block.type === "logline" && b) {
      return {
        ...block,
        content: `A tight one-line treatment built around "${b}" and the world suggested by the broader board selection.`,
      };
    }

    if (block.type === "story" && c) {
      return {
        ...block,
        content: `The sequence evolves from "${c}" into momentum, conflict, and a controlled final release.`,
      };
    }

    if (block.type === "world" && d) {
      return {
        ...block,
        content: `The world is anchored by "${d}" with clear production cues, material references, and atmosphere.`,
      };
    }

    if (block.type === "character" && e) {
      return {
        ...block,
        content: `Character framing is led by "${e}" with emphasis on silhouette, posture, and emotional voltage.`,
      };
    }

    if (block.type === "tone" && f) {
      return {
        ...block,
        content: `Tone and finish pull from "${f}" with a sharper editorial rhythm and stronger image pairing.`,
      };
    }

    if (block.type === "motif" && g) {
      return {
        ...block,
        content: `Recurring visual motifs emerge from "${g}" and repeat across sections to keep the deck cohesive.`,
      };
    }

    if (block.type === "theme" && h) {
      return {
        ...block,
        content: `Themes hinted by "${h}": desire, consequence, reinvention, and control.`,
      };
    }

    if (block.type === "stakes" && i) {
      return {
        ...block,
        content: `Stakes sharpen around "${i}" and widen from personal urgency to wider fallout.`,
      };
    }

    if (block.type === "closing") {
      return {
        ...block,
        content: j
          ? `Final note carried by "${j}".`
          : `Final note carried by "${a || deckTitle}".`,
      };
    }

    return block;
  });
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function DeckComposer({
  deck,
  onBackToLibrary,
}: {
  deck: DeckDetail;
  onBackToLibrary: () => void;
}) {
  const sourceSlides = useMemo(
    () => [...deck.slides].sort((a, b) => a.order - b.order),
    [deck.slides],
  );

  const sourceImages = useMemo(
    () =>
      sourceSlides
        .map((slide) => slide.image?.imageUrl)
        .filter((value): value is string => Boolean(value)),
    [sourceSlides],
  );

  const sourceImageTitles = useMemo(
    () => sourceSlides.map((slide) => slide.image?.title || ""),
    [sourceSlides],
  );

  const storageKey = useMemo(
    () => `pindeck-deck-state:${deck._id}`,
    [deck._id],
  );

  const previewRef = useRef<HTMLDivElement>(null);
  const presentationRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(deck.title);
  const [referenceImages, setReferenceImages] = useState<string[]>(
    sourceImages.slice(0, 10),
  );
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [colors, setColors] = useState<ColorPalette>(stylePresets.cinematic);
  const [editingColor, setEditingColor] = useState<keyof ColorPalette | null>(
    null,
  );
  const [blocks, setBlocks] = useState<BlockData[]>(() =>
    buildDeckBlocks(deck.title, sourceImageTitles),
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string>("1");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);
  const [dragOverBlock, setDragOverBlock] = useState<string | null>(null);
  const [styleVariant, setStyleVariant] = useState<StyleVariant>("cinematic");
  const [fontStyle, setFontStyle] = useState<FontStyle>("agency");
  const [layoutVariant, setLayoutVariant] =
    useState<LayoutVariant>("editorial");
  const [scrollFx, setScrollFx] = useState<ScrollFx>("parallax");
  const [overlayStrength, setOverlayStrength] = useState(58);
  const [overlayVariation, setOverlayVariation] = useState(32);
  const [overlaySeed, setOverlaySeed] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const resetToDeckDefaults = useCallback(() => {
    setTitle(deck.title);
    setReferenceImages(sourceImages.slice(0, 10));
    setActiveImageIndex(0);
    setBlocks(buildDeckBlocks(deck.title, sourceImageTitles));
    setStyleVariant("cinematic");
    setColors(stylePresets.cinematic);
    setFontStyle("agency");
    setLayoutVariant("editorial");
    setScrollFx("parallax");
    setOverlayStrength(58);
    setOverlayVariation(32);
    setOverlaySeed(0);
    setSelectedBlockId("1");
  }, [sourceImages, deck.title, sourceImageTitles]);

  /** URL for palette sampling: active strip cell, else first filled slot */
  const heroSampleUrl = useMemo(() => {
    const at = referenceImages[activeImageIndex];
    if (at) return at;
    return referenceImages.find(Boolean);
  }, [referenceImages, activeImageIndex]);

  /** Convex dominants matched to the active strip URL (`imageUrl` equality). */
  const activeHeroDominantHexes = useMemo((): string[] | null => {
    const url = referenceImages[activeImageIndex];
    if (!url) return null;
    const matched = sourceSlides.find((s) => s.image?.imageUrl === url);
    const cols = matched?.image?.colors;
    return cols?.length ? cols.filter(Boolean).map(String) : null;
  }, [sourceSlides, referenceImages, activeImageIndex]);

  useEffect(() => {
    if (document.getElementById("deck-builder-fonts")) return;
    const link = document.createElement("link");
    link.id = "deck-builder-fonts";
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const savedRaw = localStorage.getItem(storageKey);
        if (!savedRaw) {
          resetToDeckDefaults();
          return;
        }

        const saved = JSON.parse(savedRaw);
        setReferenceImages(
          Array.isArray(saved.referenceImages)
            ? saved.referenceImages.slice(0, 10)
            : sourceImages.slice(0, 10),
        );
        setTitle(typeof saved.title === "string" ? saved.title : deck.title);
        setActiveImageIndex(
          typeof saved.activeImageIndex === "number"
            ? saved.activeImageIndex
            : 0,
        );
        /* Colors come from hero `images.colors` or client extraction — not localStorage. */
        setBlocks(
          Array.isArray(saved.blocks)
            ? saved.blocks.map((block: BlockData) =>
                saved.version === STORAGE_VERSION || block.type !== "theme"
                  ? block
                  : { ...block, visible: false },
              )
            : buildDeckBlocks(deck.title, sourceImageTitles),
        );
        setStyleVariant(saved.styleVariant ?? "cinematic");
        setSelectedBlockId(
          typeof saved.selectedBlockId === "string"
            ? saved.selectedBlockId
            : "1",
        );
        setFontStyle(saved.fontStyle ?? "agency");
        setLayoutVariant(saved.layoutVariant ?? "editorial");
        setScrollFx(saved.scrollFx ?? "parallax");
        setOverlayStrength(
          typeof saved.overlayStrength === "number" ? saved.overlayStrength : 58,
        );
        setOverlayVariation(
          typeof saved.overlayVariation === "number"
            ? saved.overlayVariation
            : 32,
        );
        setOverlaySeed(
          typeof saved.overlaySeed === "number" ? saved.overlaySeed : 0,
        );
      } catch {
        resetToDeckDefaults();
      }
    };

    void run();
  }, [
    storageKey,
    resetToDeckDefaults,
    sourceImages,
    sourceImageTitles,
    deck.title,
  ]);

  /**
   * Swatches must match the hero still: sample from the image URL first (with blob
   * fallback if CORS taints the canvas). Convex `images.colors` is only a fallback
   * so stale DB swatches don’t override a correct client read.
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const url = heroSampleUrl;
      if (url?.startsWith("http") || url?.startsWith("data:")) {
        try {
          const extracted = await extractColors(url);
          if (!cancelled) setColors(withAliases(extracted));
          return;
        } catch {
          /* try Convex palette */
        }
      }

      if (activeHeroDominantHexes && activeHeroDominantHexes.length >= 3) {
        try {
          const merged = withAliases(
            paletteFromDominantHexes(activeHeroDominantHexes),
          );
          if (!cancelled) setColors(merged);
        } catch {
          /* keep preset */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    deck._id,
    heroSampleUrl,
    activeHeroDominantHexes?.join("|") ?? "",
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            version: STORAGE_VERSION,
            title,
            referenceImages,
            activeImageIndex,
            blocks,
            styleVariant,
            fontStyle,
            layoutVariant,
            scrollFx,
            overlayStrength,
            overlayVariation,
            overlaySeed,
            selectedBlockId,
          }),
        );
        setHasUnsavedChanges(false);
      } catch {
        // no-op
      }
    }, 500);

    setHasUnsavedChanges(true);
    return () => clearTimeout(timer);
  }, [
    storageKey,
    title,
    referenceImages,
    activeImageIndex,
    blocks,
    styleVariant,
    fontStyle,
    layoutVariant,
    scrollFx,
    overlayStrength,
    overlayVariation,
    overlaySeed,
    selectedBlockId,
  ]);

  useEffect(() => {
    if (!isPreviewOpen || !presentationRef.current) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      if (cancelled || !presentationRef.current) return;

      gsap.registerPlugin(ScrollTrigger);

      const scroller = presentationRef.current;
      const sections = Array.from(
        scroller.querySelectorAll<HTMLElement>('[data-gsap="section"]'),
      );

      const context = gsap.context(() => {
        sections.forEach((section) => {
          const copy = Array.from(
            section.querySelectorAll<HTMLElement>("h1, h2, p, span"),
          );
          const media = Array.from(
            section.querySelectorAll<HTMLElement>("img"),
          );

          gsap.fromTo(
            section,
            { autoAlpha: 0.58, y: 32 },
            {
              autoAlpha: 1,
              y: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: section,
                scroller,
                start: "top 88%",
                end: "top 34%",
                scrub: 0.45,
              },
            },
          );

          if (copy.length > 0) {
            gsap.fromTo(
              copy,
              { autoAlpha: 0, y: 38 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.85,
                ease: "power3.out",
                stagger: 0.05,
                scrollTrigger: {
                  trigger: section,
                  scroller,
                  start: "top 72%",
                  toggleActions: "play none none reverse",
                },
              },
            );
          }

          if (media.length > 0) {
            gsap.fromTo(
              media,
              { scale: 1.08, autoAlpha: 0.82 },
              {
                scale: 1,
                autoAlpha: 1,
                ease: "none",
                stagger: 0.04,
                scrollTrigger: {
                  trigger: section,
                  scroller,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.8,
                },
              },
            );
          }
        });

        ScrollTrigger.refresh();
      }, scroller);

      cleanup = () => {
        context.revert();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [isPreviewOpen]);

  const handleImageUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const availableSlots = 10 - referenceImages.length;
      if (availableSlots <= 0) {
        toast.error("Maximum 10 images allowed");
        return;
      }

      const filesToProcess = Array.from(files).slice(0, availableSlots);
      const validFiles = filesToProcess.filter((file) => {
        if (!file.type.startsWith("image/")) {
          toast.error(`Skipped ${file.name}: not an image`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Skipped ${file.name}: file too large (10MB max)`);
          return false;
        }
        return true;
      });

      const readAsDataUrl = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (loadEvent) => {
            const result = loadEvent.target?.result;
            resolve(typeof result === "string" ? result : "");
          };
          reader.onerror = () =>
            reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        });

      try {
        const newImages = await Promise.all(validFiles.map(readAsDataUrl));
        const merged = [...referenceImages, ...newImages].slice(0, 10);
        setReferenceImages(merged);
        setActiveImageIndex(Math.max(0, merged.length - 1));
        toast.success(
          `Added ${newImages.length} image${newImages.length === 1 ? "" : "s"}`,
        );

        const sampleNew = newImages[newImages.length - 1];
        if (sampleNew) {
          try {
            const extracted = await extractColors(sampleNew);
            setColors(withAliases(extracted));
          } catch {
            // Ignore extraction failure on upload.
          }
        }
      } catch {
        toast.error("Some images failed to load");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [referenceImages],
  );

  const handleColorChange = useCallback(
    (key: keyof ColorPalette, value: string) => {
      setColors((previous) =>
        withAliases({
          ...previous,
          [key]: value,
        }),
      );
    },
    [],
  );

  const openColorEditor = useCallback(
    (key: keyof ColorPalette, value: string) => {
      setEditingColor(key);

      const input = colorInputRef.current as ColorPickerInput | null;
      if (!input) return;

      input.value = value;

      try {
        if (typeof input.showPicker === "function") {
          input.showPicker();
          return;
        }
      } catch {
        // Fall back to the standard click-triggered picker below.
      }

      input.click();
    },
    [],
  );

  const toggleBlockLock = useCallback((blockId: string) => {
    setBlocks((previous) =>
      previous.map((block) =>
        block.id === blockId ? { ...block, locked: !block.locked } : block,
      ),
    );
  }, []);

  const toggleBlockVisibility = useCallback((blockId: string) => {
    setBlocks((previous) =>
      previous.map((block) =>
        block.id === blockId ? { ...block, visible: !block.visible } : block,
      ),
    );
  }, []);

  const handleDragStart = useCallback((blockId: string) => {
    setDraggedBlock(blockId);
  }, []);

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>, blockId: string) => {
      event.preventDefault();
      if (blockId !== draggedBlock) {
        setDragOverBlock(blockId);
      }
    },
    [draggedBlock],
  );

  const handleDrop = useCallback(
    (targetBlockId: string) => {
      if (!draggedBlock || draggedBlock === targetBlockId) return;

      setBlocks((previous) => {
        const draggedIndex = previous.findIndex(
          (block) => block.id === draggedBlock,
        );
        const targetIndex = previous.findIndex(
          (block) => block.id === targetBlockId,
        );
        if (draggedIndex < 0 || targetIndex < 0) return previous;

        const reordered = [...previous];
        const [removed] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, removed);
        return reordered;
      });

      setDraggedBlock(null);
      setDragOverBlock(null);
    },
    [draggedBlock],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedBlock(null);
    setDragOverBlock(null);
  }, []);

  const resetToDefaults = useCallback(() => {
    localStorage.removeItem(storageKey);
    resetToDeckDefaults();
    toast.info("Reset deck builder state");
  }, [storageKey, resetToDeckDefaults]);

  const exportToPDF = useCallback(async () => {
    if (!previewRef.current) return;

    setIsExporting(true);
    toast.info("Generating PDF...");

    try {
      const element = previewRef.current;
      const allSlides = element.querySelectorAll(".slide-block");
      const contentSlides: HTMLElement[] = [];

      allSlides.forEach((slide) => {
        const node = slide as HTMLElement;
        if (node.offsetHeight > 100) {
          contentSlides.push(node);
        }
      });

      if (contentSlides.length === 0) {
        toast.error("No slides to export");
        setIsExporting(false);
        return;
      }

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const pageWidth = 1920;
      const pageHeight = 1080;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [pageWidth, pageHeight],
      });

      for (let index = 0; index < contentSlides.length; index += 1) {
        const slide = contentSlides[index];
        const canvas = await html2canvas(slide, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: colors.background,
          logging: false,
        });

        const ratio = Math.min(
          pageWidth / canvas.width,
          pageHeight / canvas.height,
        );
        const finalWidth = canvas.width * ratio;
        const finalHeight = canvas.height * ratio;
        const x = (pageWidth - finalWidth) / 2;
        const y = (pageHeight - finalHeight) / 2;

        if (index > 0) {
          pdf.addPage([pageWidth, pageHeight], "landscape");
        }

        pdf.setFillColor(colors.background);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          x,
          y,
          finalWidth,
          finalHeight,
        );
      }

      pdf.save(`${title || deck.title || "deck"}.pdf`);
      toast.success(`PDF exported (${contentSlides.length} pages)`);
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  }, [colors.background, deck.title, title]);

  const visibleBlocks = useMemo(
    () => blocks.filter((block) => block.visible),
    [blocks],
  );

  const selectedBlock = useMemo(
    () =>
      visibleBlocks.find((block) => block.id === selectedBlockId) ??
      visibleBlocks[0] ??
      null,
    [visibleBlocks, selectedBlockId],
  );

  const overlayAssignments = useMemo(
    () =>
      visibleBlocks.map((block, index) => {
        if (!referenceImages.length) return false;
        if (block.type === "hero" || block.type === "closing") return true;
        const score =
          hashString(`${deck._id}:${block.id}:${index}:${overlaySeed}`) % 100;
        return score < 64;
      }),
    [visibleBlocks, referenceImages.length, deck._id, overlaySeed],
  );

  const overlayDirections = useMemo(
    () =>
      visibleBlocks.map((block, index) => {
        const blockBias =
          block.type === "hero" || block.type === "closing"
            ? "bottom"
            : block.type === "story" || block.type === "world"
              ? "left"
              : block.type === "character"
                ? "right"
                : "bottom";

        const options = ["bottom", "top", "left", "right", "radial"] as const;
        const score =
          hashString(
            `${deck._id}:${block.id}:gradient:${index}:${overlaySeed}`,
          ) % options.length;
        const randomDirection = options[score];
        return overlayVariation <= 10 ? blockBias : randomDirection;
      }),
    [visibleBlocks, deck._id, overlaySeed, overlayVariation],
  );

  const overlayStrengths = useMemo(
    () =>
      visibleBlocks.map((block, index) => {
        const variance =
          hashString(
            `${deck._id}:${block.id}:strength:${index}:${overlaySeed}`,
          ) % 100;
        const jitter = (variance / 100 - 0.5) * overlayVariation;
        return Math.max(8, Math.min(100, overlayStrength + jitter));
      }),
    [visibleBlocks, deck._id, overlaySeed, overlayStrength, overlayVariation],
  );

  const chromeFont = "var(--pd-font-sans)" as const;

  return (
    <div className="deck-scope relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden border border-white/10 bg-[#050505] text-white shadow-[0_35px_120px_rgba(0,0,0,0.45)]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          void handleImageUpload(event);
        }}
        className="hidden"
      />
      <input
        ref={colorInputRef}
        type="color"
        className="pointer-events-none fixed left-[-9999px] top-0 h-px w-px opacity-0"
        onChange={(event) => {
          if (editingColor) {
            handleColorChange(editingColor, event.target.value);
          }
        }}
        onBlur={() => setEditingColor(null)}
      />

      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <aside
          className={cn(
            "flex min-h-0 w-[328px] shrink-0 flex-col overflow-hidden border-r border-white/8 bg-[#0d0d10] text-white",
            sidebarOpen ? "flex" : "hidden lg:flex",
          )}
          style={{ fontFamily: chromeFont }}
        >
          <div className="border-b-2 border-[var(--pd-green)] px-5 py-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((value) => !value)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-white/10 text-white/55 transition-colors hover:text-white lg:hidden"
              >
                ×
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button
                    type="button"
                    onClick={onBackToLibrary}
                    className="rounded border border-white/20 bg-white/[0.03] px-2 py-1 text-left text-[10px] font-medium leading-none tracking-wide text-white/90 transition-colors hover:border-white/30 hover:bg-white/[0.05] hover:text-white"
                  >
                    ← Decks
                  </button>
                  <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/32">
                    COMPOSER
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6">
            <div className="space-y-8">
              <section className="space-y-3">
                <div className="flex items-center gap-3 border-b border-white/8 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
                    Deck Name
                  </span>
                </div>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-11 w-full rounded-[4px] border border-white/10 bg-[#121218] px-4 text-[0.98rem] font-medium text-white outline-none"
                />
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-3 border-b border-white/8 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
                    Images
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--pd-accent)]">
                    {referenceImages.filter(Boolean).length}/10
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }).map((_, index) => {
                    const image = referenceImages[index];
                    const isActive =
                      index === activeImageIndex && Boolean(image);
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          if (image) {
                            setActiveImageIndex(index);
                          } else {
                            fileInputRef.current?.click();
                          }
                        }}
                        title={
                          sourceImageTitles[index] || `Reference ${index + 1}`
                        }
                        className={cn(
                          "relative aspect-[4/3] overflow-hidden rounded-[3px] border text-white/30 transition-all",
                          image
                            ? isActive
                              ? "border-[var(--pd-accent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--pd-accent)_42%,transparent)]"
                              : "border-white/10 hover:border-white/20"
                            : "border-dashed border-white/10 bg-white/[0.02]",
                        )}
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={`Reference ${index + 1}`}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-sm">
                            +
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3">
                <div className="border-b border-white/8 pb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500/90">
                  Colors
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    {
                      key: "primary" as const,
                      label: "PRI",
                      value: colors.primary,
                    },
                    {
                      key: "secondary" as const,
                      label: "SEC",
                      value: colors.secondary,
                    },
                    {
                      key: "accent" as const,
                      label: "ACC",
                      value: colors.accent,
                    },
                    {
                      key: "tertiary" as const,
                      label: "DAR",
                      value: colors.tertiary,
                    },
                    {
                      key: "surface" as const,
                      label: "LIQ",
                      value: colors.surface,
                    },
                  ].map((swatch) => (
                    <button
                      key={swatch.label}
                      type="button"
                      onClick={() => openColorEditor(swatch.key, swatch.value)}
                      className="flex aspect-[1/1.15] w-full min-h-0 min-w-0 flex-col overflow-hidden rounded border border-white/[0.1] bg-black/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                      title={swatch.label}
                    >
                      <div
                        className="min-h-0 flex-1"
                        style={{ backgroundColor: swatch.value }}
                      />
                      <div
                        className="flex w-full shrink-0 items-center justify-center border-t border-black/55 py-1"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${swatch.value} 22%, #070709)`,
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                        }}
                      >
                        <span className="font-mono text-[7.5px] font-semibold uppercase tracking-[0.2em] text-zinc-400/85">
                          {swatch.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/8 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
                    Overlay
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
                    {overlayStrength}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={overlayStrength}
                  onChange={(event) =>
                    setOverlayStrength(Number(event.target.value))
                  }
                  className="deck-rect-range w-full"
                />
                <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-white/28">
                  <span>Show image</span>
                  <span>Dark</span>
                </div>
              </section>

              <section className="space-y-3">
                <div className="border-b border-white/8 pb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
                  Typography
                </div>
                <div className="deck-composer-select w-full min-w-0">
                <Select.Root
                  value={fontStyle}
                  onValueChange={(v) => setFontStyle(v as FontStyle)}
                >
                  <Select.Trigger
                    className={cn(
                      "w-full max-w-full !min-h-14 rounded-[4px] border border-white/10 !bg-[#121218] px-3 !py-3.5 data-[state=open]:border-white/20",
                      FIELD_CLASS,
                    )}
                    aria-label="Typography preset"
                  >
                    {(() => {
                      const option = FONT_OPTIONS.find((o) => o.id === fontStyle);
                      if (!option) {
                        return (
                          <span className="text-[10px] text-white/45">
                            Choose typography
                          </span>
                        );
                      }
                      return (
                        <div className="flex min-w-0 max-w-full items-center gap-2.5">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-white/10 bg-white/[0.04] text-[11px] font-semibold text-white/90"
                            style={{ fontFamily: option.previewFamily }}
                          >
                            {option.preview}
                          </div>
                          <div className="min-w-0 flex-1 text-left leading-tight">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-200/92">
                              {option.name}
                            </div>
                            <div className="mt-0.5 truncate text-[9px] text-white/45">
                              {option.detail}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </Select.Trigger>
                  <Select.Content
                    className="deck-composer-select-content z-[200] max-h-[min(70vh,360px)]"
                    position="popper"
                    sideOffset={4}
                    align="start"
                  >
                    {FONT_OPTIONS.map((option) => (
                      <Select.Item
                        key={option.id}
                        value={option.id}
                        textValue={`${option.name} ${option.detail}`}
                        className="!min-h-0 !py-2.5 !pl-2 !pr-3"
                      >
                        <div className="flex min-w-0 max-w-[280px] items-center gap-2.5">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-white/10 bg-white/[0.04] text-[11px] font-semibold text-white/90"
                            style={{ fontFamily: option.previewFamily }}
                          >
                            {option.preview}
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-200/92">
                              {option.name}
                            </div>
                            <div className="mt-0.5 truncate text-[9px] leading-tight text-white/45">
                              {option.detail}
                            </div>
                          </div>
                        </div>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                </div>
              </section>

              <section className="space-y-3">
                <div className="border-b border-white/8 pb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
                  GSAP SCROLL FX
                </div>
                <div className="deck-composer-select w-full min-w-0">
                <Select.Root
                  value={scrollFx}
                  onValueChange={(v) => setScrollFx(v as ScrollFx)}
                >
                  <Select.Trigger
                    className={cn(
                      "w-full max-w-full min-h-11 rounded-[4px] border border-white/10 !bg-[#121218] px-3 py-2 data-[state=open]:border-white/20",
                      FIELD_CLASS,
                    )}
                    aria-label="GSAP scroll effect"
                  >
                    <span className="block min-w-0 flex-1 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90">
                      {SCROLL_FX_OPTIONS.find((o) => o.id === scrollFx)?.label ??
                        scrollFx.toUpperCase()}
                    </span>
                  </Select.Trigger>
                  <Select.Content
                    className="deck-composer-select-content z-[200] max-h-[min(70vh,320px)]"
                    position="popper"
                    sideOffset={4}
                    align="start"
                  >
                    {SCROLL_FX_OPTIONS.map((option) => (
                      <Select.Item
                        key={option.id}
                        value={option.id}
                        textValue={option.label}
                        className="!pl-3 !pr-3"
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                          {option.label}
                        </span>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                </div>
              </section>

              <section className="space-y-3">
                <div className="border-b border-white/8 pb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
                  Layout
                </div>
                <div className="flex flex-col gap-2">
                  {LAYOUT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setLayoutVariant(option.id)}
                      className={cn(
                        "relative w-full rounded-[3px] border px-3 pb-6 pt-2.5 text-left outline-none ring-0 transition-all focus-visible:border-[var(--pd-accent)] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--pd-accent)_35%,transparent)]",
                        layoutVariant === option.id
                          ? "border-[var(--pd-accent)] bg-[var(--pd-accent-soft)] text-[var(--pd-accent-ink)]"
                          : "border-white/10 bg-[#111117] text-white/50 hover:text-white",
                      )}
                    >
                      <span
                        className={cn(
                          "block text-[11px] font-semibold uppercase tracking-[0.12em]",
                          layoutVariant === option.id
                            ? "text-[var(--pd-accent-ink)]"
                            : "text-white/78",
                        )}
                      >
                        {option.name}
                      </span>
                      <p
                        className={cn(
                          "mt-1.5 w-full pr-6 text-[9px] leading-snug",
                          layoutVariant === option.id
                            ? "text-[var(--pd-accent-ink)]/75"
                            : "text-white/40",
                        )}
                      >
                        {option.detail}
                      </p>
                      <span
                        className={cn(
                          "pointer-events-none absolute bottom-1.5 right-2 font-mono text-[10px] uppercase tracking-[0.18em]",
                          layoutVariant === option.id
                            ? "text-[var(--pd-accent-ink)]/55"
                            : "text-white/22",
                        )}
                        aria-hidden={true}
                      >
                        {option.short}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/8 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500/90">
                    Blocks
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500/80">
                    {visibleBlocks.length}/{blocks.length} visible
                  </span>
                </div>
                <div className="space-y-2">
                  {blocks.map((block) => (
                    <div
                      key={block.id}
                      draggable
                      onClick={() => setSelectedBlockId(block.id)}
                      onDragStart={() => handleDragStart(block.id)}
                      onDragOver={(event) => handleDragOver(event, block.id)}
                      onDrop={() => handleDrop(block.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex cursor-grab select-none items-center gap-2.5 rounded-[4px] border px-2.5 py-2.5 transition-[border-color,background-color,opacity,box-shadow] active:cursor-grabbing",
                        draggedBlock === block.id && "opacity-50",
                        !block.visible && "opacity-[0.48]",
                        selectedBlockId === block.id
                          ? "border-[var(--pd-accent)] bg-[var(--pd-accent-soft)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                          : dragOverBlock === block.id
                            ? "border-[color:color-mix(in_srgb,var(--pd-accent)_35%,transparent)] bg-white/[0.02]"
                            : "border-white/[0.08] bg-[#0c0c10]",
                      )}
                    >
                      <span
                        className="shrink-0 text-white/22"
                        aria-hidden={true}
                      >
                        <DragHandleDots2Icon className="h-4 w-4" />
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-200/85",
                          !block.visible && "text-zinc-500/90",
                        )}
                      >
                        {block.title}
                      </span>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleBlockLock(block.id);
                          }}
                          className={cn(
                            "rounded p-1.5 transition-colors",
                            block.locked
                              ? "text-[var(--pd-accent)] hover:text-[var(--pd-accent-ink)]"
                              : "text-zinc-500/90 hover:text-zinc-400/90",
                          )}
                          title={block.locked ? "Unlock block" : "Lock block"}
                        >
                          {block.locked ? (
                            <LockClosedIcon className="h-4 w-4" />
                          ) : (
                            <LockOpen1Icon className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleBlockVisibility(block.id);
                          }}
                          className={cn(
                            "rounded p-1.5 transition-colors",
                            block.visible
                              ? "text-[var(--pd-accent)] hover:text-[var(--pd-accent-ink)]"
                              : "text-zinc-500/50 hover:text-zinc-400/70",
                          )}
                          title={block.visible ? "Hide block" : "Show block"}
                        >
                          {block.visible ? (
                            <EyeOpenIcon className="h-4 w-4" />
                          ) : (
                            <EyeNoneIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div className="border-t border-white/8 px-5 py-4">
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-[var(--pd-accent)] px-4 py-4 text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--pd-accent-contrast-text)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)] transition-[filter] hover:brightness-105"
            >
              ▶ Present Live
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => void exportToPDF()}
                disabled={isExporting}
                className="rounded-[4px] border border-white/12 px-4 py-3 text-[12px] font-semibold text-white/72 transition-colors hover:text-white disabled:opacity-50"
              >
                {isExporting ? "Exporting..." : "PDF"}
              </button>
              <button
                onClick={resetToDefaults}
                className="rounded-[4px] border border-white/12 px-4 py-3 text-[12px] font-semibold text-white/72 transition-colors hover:text-white"
              >
                Reset
              </button>
            </div>
          </div>
        </aside>

        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          style={{ fontFamily: chromeFont }}
        >
          <div className="sticky top-0 z-30 shrink-0 border-b border-white/8 bg-[#09090b]/96 px-5 py-4 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-white/48">Deck workspace</span>
              <span className="text-white/18">|</span>
              <span className="text-[10px] uppercase tracking-[0.28em] text-white/35">
                DECK /
              </span>
              <span className="text-[1.05rem] font-semibold text-white">
                {title}
              </span>
              <span className="border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/72">
                {STYLE_OPTIONS.find((option) => option.id === styleVariant)
                  ?.topLabel || "TREATMENT"}
              </span>
              <span className="border border-[var(--pd-accent)]/45 bg-[var(--pd-accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--pd-accent)]">
                FX · {scrollFx.toUpperCase()}
              </span>
              <span className="border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/72">
                {visibleBlocks.length} BLOCKS
              </span>
              <div className="flex-1" />
              {hasUnsavedChanges ? (
                <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--pd-accent-ink)]">
                  Unsaved
                </span>
              ) : null}
              <button
                onClick={() => setSidebarOpen((value) => !value)}
                className="rounded-[4px] border border-white/12 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/72 lg:hidden"
              >
                {sidebarOpen ? "Hide edit" : "Show edit"}
              </button>
              <button
                onClick={() => setIsPreviewMode((value) => !value)}
                className={cn(
                  "rounded-[4px] border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors",
                  isPreviewMode
                    ? "border-[var(--pd-accent)] bg-[var(--pd-accent-soft)] text-[var(--pd-accent-ink)]"
                    : "border-white/12 text-white/62 hover:text-white",
                )}
              >
                {isPreviewMode ? "Edit" : "Preview"}
              </button>
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="rounded-[4px] bg-[var(--pd-accent)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--pd-accent-contrast-text)] hover:brightness-105"
              >
                Present
              </button>
            </div>
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#050507]">
            <div className="px-6 py-6">
              {selectedBlock && !isPreviewMode ? (
                <div className="mx-auto mb-3 flex w-full max-w-[620px] flex-wrap items-center justify-between gap-3 border border-white/8 bg-[#0b0b0d] px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
                  <span>
                    Selected ·{" "}
                    <span className="text-white/78">
                      {selectedBlock.title}
                    </span>
                  </span>
                  <span className="font-medium text-[var(--pd-accent)]">
                    {LAYOUT_OPTIONS.find((o) => o.id === layoutVariant)?.name ??
                      "Layout A"}
                  </span>
                </div>
              ) : null}
              <div ref={previewRef} className="mx-auto w-full max-w-[620px]">
                <DeckCanvasPage
                  title={title}
                  blocks={blocks}
                  colors={colors}
                  referenceImages={referenceImages}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
                  fontStyle={fontStyle}
                  layoutVariant={layoutVariant}
                  overlayStrength={overlayStrength}
                  editable={!isPreviewMode}
                />
              </div>
            </div>
          </main>
        </div>
      </div>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-[120] bg-black/95">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-black/70 px-4 py-4 backdrop-blur-sm sm:px-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">
                Live presentation
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
            </div>
            <Button
              size="1"
              variant="soft"
              color="gray"
              onClick={() => setIsPreviewOpen(false)}
            >
              Close
            </Button>
          </div>

          <div
            ref={presentationRef}
            className="h-[calc(100vh-78px)] overflow-y-auto snap-y snap-mandatory"
          >
            {visibleBlocks.map((block, index) => (
              <div
                key={`${block.id}-presentation`}
                className="slide-block snap-start"
              >
                <DeckSection
                  block={block}
                  index={index}
                  theme="cinematic"
                  colors={colors}
                  imageUrl={
                    referenceImages[
                      index % Math.max(referenceImages.length, 1)
                    ] ?? null
                  }
                  referenceImages={referenceImages}
                  imageIndex={index}
                  fontStyle={fontStyle}
                  layoutVariant={
                    block.layout === "B" ? "collage" : layoutVariant
                  }
                  overlayOpacity={
                    overlayAssignments[index] ? overlayStrengths[index] : 0
                  }
                  overlayEnabled={overlayAssignments[index]}
                  overlayDirection={overlayDirections[index]}
                  isEditing={false}
                  dataGsap
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
