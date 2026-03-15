import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Box, Button, Card, Flex, Text } from "@radix-ui/themes";
import { toast } from "sonner";
import { DeckSection } from "./DeckSection";
import type {
  BlockData,
  ColorPalette,
  FontStyle,
  LayoutVariant,
  StyleVariant,
} from "./types";
import { cn } from "./utils/cn";
import { defaultColors, extractColors } from "./utils/colorExtractor";
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
  } | null;
};

export type DeckDetail = {
  _id: Id<"decks">;
  title: string;
  boardName?: string | null;
  createdAt: number;
  slides: DeckSlide[];
};

type ComposerPanel = "layout" | "style" | "content" | "media";

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
  detail: string;
}> = [
  {
    id: "editorial",
    name: "Editorial",
    detail: "Wide frames, cinematic pacing, strong hero moments.",
  },
  {
    id: "collage",
    name: "Structured Grid",
    detail: "Dense composition, modular cards, stronger image rhythm.",
  },
];

const styleVariants: { id: StyleVariant; name: string }[] = [
  { id: "cinematic", name: "Cinematic" },
  { id: "bold", name: "Bold" },
  { id: "minimal", name: "Minimal" },
  { id: "noir", name: "Noir" },
  { id: "neon", name: "Neon" },
];

const COLOR_KEYS: Array<{
  key: keyof ColorPalette;
  label: string;
}> = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "tertiary", label: "Tertiary" },
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
  { key: "muted", label: "Muted" },
  { key: "border", label: "Border" },
];

const STORAGE_VERSION = 2;
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
  },
  {
    id: "2",
    type: "logline",
    title: "LOGLINE",
    content:
      "A one-breath summary that turns the image set into a pitch you can feel instantly.",
    layout: "A",
    visible: true,
  },
  {
    id: "3",
    type: "story",
    title: "STORY",
    content:
      "A progression from setup to escalation to release, framed with visual clarity and emotional lift.",
    layout: "A",
    visible: true,
  },
  {
    id: "4",
    type: "world",
    title: "WORLD & CONCEPT",
    content:
      "Production design, setting logic, and tonal references all anchored in the selected image language.",
    layout: "A",
    visible: true,
  },
  {
    id: "5",
    type: "character",
    title: "CHARACTER",
    content:
      "A lead presence shaped by silhouette, attitude, costume, and emotional tension.",
    layout: "A",
    visible: true,
  },
  {
    id: "6",
    type: "tone",
    title: "TONE & STYLE",
    content:
      "The deck should broadcast how it feels before anyone reads a paragraph.",
    layout: "A",
    visible: true,
  },
  {
    id: "7",
    type: "motif",
    title: "VISUAL MOTIFS",
    content:
      "Repeatable shapes, materials, and lighting signatures that give the deck continuity.",
    layout: "A",
    visible: true,
  },
  {
    id: "8",
    type: "theme",
    title: "THEMES",
    content: "Identity, consequence, transformation, obsession.",
    layout: "A",
    visible: true,
  },
  {
    id: "9",
    type: "stakes",
    title: "STAKES",
    content:
      "If the central figure fails, the fallout grows from private collapse to a wider public impact.",
    layout: "A",
    visible: true,
  },
  {
    id: "10",
    type: "closing",
    title: "CLOSING",
    content: "A final image and phrase that leaves the room wanting the next page.",
    layout: "A",
    visible: true,
  },
];

function withAliases(palette: Partial<ColorPalette> | undefined): ColorPalette {
  const merged = {
    ...defaultColors,
    ...(palette ?? {}),
  };

  const background = merged.background ?? merged.dark ?? defaultColors.background;
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

function buildDeckBlocks(deckTitle: string, imageTitles: string[]): BlockData[] {
  const [a, b, c, d, e, f, g, h, i, j] = imageTitles;

  return templateBlocks.map((block) => {
    if (block.type === "hero") {
      return {
        ...block,
        title: deckTitle || "PITCH DECK",
        content: a
          ? `Built from the visual DNA of "${a}" and expanded into a sharper deck experience.`
          : "Built from your selected board imagery and tuned for presentation flow.",
      };
    }

    if (block.type === "logline" && b) {
      return {
        ...block,
        content: `A tight pitch statement built around "${b}" and the world suggested by the broader board selection.`,
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

export function DeckComposer({ deck }: { deck: DeckDetail }) {
  const sourceSlides = useMemo(
    () => [...deck.slides].sort((a, b) => a.order - b.order),
    [deck.slides]
  );

  const sourceImages = useMemo(
    () =>
      sourceSlides
        .map((slide) => slide.image?.imageUrl)
        .filter((value): value is string => Boolean(value)),
    [sourceSlides]
  );

  const sourceImageTitles = useMemo(
    () => sourceSlides.map((slide) => slide.image?.title || ""),
    [sourceSlides]
  );

  const storageKey = useMemo(
    () => `pindeck-deck-state:${deck._id}`,
    [deck._id]
  );

  const previewRef = useRef<HTMLDivElement>(null);
  const presentationRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const [referenceImages, setReferenceImages] = useState<string[]>(
    sourceImages.slice(0, 10)
  );
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [colors, setColors] = useState<ColorPalette>(stylePresets.cinematic);
  const [editingColor, setEditingColor] = useState<keyof ColorPalette | null>(null);
  const [blocks, setBlocks] = useState<BlockData[]>(() =>
    buildDeckBlocks(deck.title, sourceImageTitles)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);
  const [dragOverBlock, setDragOverBlock] = useState<string | null>(null);
  const [styleVariant, setStyleVariant] = useState<StyleVariant>("cinematic");
  const [fontStyle, setFontStyle] = useState<FontStyle>("agency");
  const [layoutVariant, setLayoutVariant] = useState<LayoutVariant>("editorial");
  const [overlayStrength, setOverlayStrength] = useState(58);
  const [overlaySeed, setOverlaySeed] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ComposerPanel>("style");

  const resetToDeckDefaults = useCallback(() => {
    setReferenceImages(sourceImages.slice(0, 10));
    setActiveImageIndex(0);
    setBlocks(buildDeckBlocks(deck.title, sourceImageTitles));
    setStyleVariant("cinematic");
    setColors(stylePresets.cinematic);
    setFontStyle("agency");
    setLayoutVariant("editorial");
    setOverlayStrength(58);
    setOverlaySeed(0);
    setActivePanel("style");
  }, [sourceImages, deck.title, sourceImageTitles]);

  useEffect(() => {
    if (document.getElementById("deck-builder-fonts")) return;
    const link = document.createElement("link");
    link.id = "deck-builder-fonts";
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
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
          : sourceImages.slice(0, 10)
      );
      setActiveImageIndex(
        typeof saved.activeImageIndex === "number" ? saved.activeImageIndex : 0
      );
      setColors(withAliases(saved.colors));
      setBlocks(
        Array.isArray(saved.blocks)
          ? saved.blocks
          : buildDeckBlocks(deck.title, sourceImageTitles)
      );
      setStyleVariant(saved.styleVariant ?? "cinematic");
      setFontStyle(saved.fontStyle ?? "agency");
      setLayoutVariant(saved.layoutVariant ?? "editorial");
      setOverlayStrength(
        typeof saved.overlayStrength === "number" ? saved.overlayStrength : 58
      );
      setOverlaySeed(typeof saved.overlaySeed === "number" ? saved.overlaySeed : 0);
      setActivePanel(saved.activePanel ?? "style");
    } catch {
      resetToDeckDefaults();
    }
  }, [storageKey, resetToDeckDefaults, sourceImages, sourceImageTitles, deck.title]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            version: STORAGE_VERSION,
            referenceImages,
            activeImageIndex,
            colors,
            blocks,
            styleVariant,
            fontStyle,
            layoutVariant,
            overlayStrength,
            overlaySeed,
            activePanel,
          })
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
    referenceImages,
    activeImageIndex,
    colors,
    blocks,
    styleVariant,
    fontStyle,
    layoutVariant,
    overlayStrength,
    overlaySeed,
    activePanel,
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
        scroller.querySelectorAll<HTMLElement>('[data-gsap="section"]')
      );

      const context = gsap.context(() => {
        sections.forEach((section) => {
          const copy = Array.from(
            section.querySelectorAll<HTMLElement>("h1, h2, p, span")
          );
          const media = Array.from(section.querySelectorAll<HTMLElement>("img"));

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
            }
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
              }
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
              }
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
          reader.onload = (loadEvent) => resolve(String(loadEvent.target?.result ?? ""));
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        });

      try {
        const newImages = await Promise.all(validFiles.map(readAsDataUrl));
        const merged = [...referenceImages, ...newImages].slice(0, 10);
        setReferenceImages(merged);
        setActiveImageIndex(Math.max(0, merged.length - 1));
        toast.success(`Added ${newImages.length} image${newImages.length === 1 ? "" : "s"}`);

        if (newImages[0]) {
          try {
            const extracted = await extractColors(newImages[0]);
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
    [referenceImages]
  );

  const removeImage = useCallback(
    (index: number) => {
      setReferenceImages((previous) => {
        const next = previous.filter((_, imageIndex) => imageIndex !== index);
        if (activeImageIndex >= next.length) {
          setActiveImageIndex(Math.max(0, next.length - 1));
        }
        return next;
      });
      toast.info("Image removed");
    },
    [activeImageIndex]
  );

  const extractColorsFromImage = useCallback(
    async (index: number) => {
      const imageUrl = referenceImages[index];
      if (!imageUrl) return;
      try {
        const extracted = await extractColors(imageUrl);
        setColors(withAliases(extracted));
        toast.success("Colors extracted");
      } catch {
        toast.error("Failed to extract colors");
      }
    },
    [referenceImages]
  );

  const handleColorChange = useCallback(
    (key: keyof ColorPalette, value: string) => {
      setColors((previous) =>
        withAliases({
          ...previous,
          [key]: value,
        })
      );
    },
    []
  );

  const applyStylePreset = useCallback((variant: StyleVariant) => {
    setStyleVariant(variant);
    setColors(stylePresets[variant]);
    toast.success(`${variant} palette applied`);
  }, []);

  const handleBlockUpdate = useCallback((updated: BlockData) => {
    setBlocks((previous) =>
      previous.map((block) => (block.id === updated.id ? updated : block))
    );
  }, []);

  const toggleBlockVisibility = useCallback((blockId: string) => {
    setBlocks((previous) =>
      previous.map((block) =>
        block.id === blockId ? { ...block, visible: !block.visible } : block
      )
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
    [draggedBlock]
  );

  const handleDrop = useCallback(
    (targetBlockId: string) => {
      if (!draggedBlock || draggedBlock === targetBlockId) return;

      setBlocks((previous) => {
        const draggedIndex = previous.findIndex((block) => block.id === draggedBlock);
        const targetIndex = previous.findIndex((block) => block.id === targetBlockId);
        if (draggedIndex < 0 || targetIndex < 0) return previous;

        const reordered = [...previous];
        const [removed] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, removed);
        return reordered;
      });

      setDraggedBlock(null);
      setDragOverBlock(null);
    },
    [draggedBlock]
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

        const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
        const finalWidth = canvas.width * ratio;
        const finalHeight = canvas.height * ratio;
        const x = (pageWidth - finalWidth) / 2;
        const y = (pageHeight - finalHeight) / 2;

        if (index > 0) {
          pdf.addPage([pageWidth, pageHeight], "landscape");
        }

        pdf.setFillColor(colors.background);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, finalWidth, finalHeight);
      }

      pdf.save(`${deck.title || "pitch-deck"}.pdf`);
      toast.success(`PDF exported (${contentSlides.length} pages)`);
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  }, [colors.background, deck.title]);

  const visibleBlocks = useMemo(
    () => blocks.filter((block) => block.visible),
    [blocks]
  );

  const overlayAssignments = useMemo(
    () =>
      visibleBlocks.map((block, index) => {
        if (!referenceImages.length) return false;
        if (block.type === "hero" || block.type === "closing") return true;
        const score = hashString(`${deck._id}:${block.id}:${index}:${overlaySeed}`) % 100;
        return score < 64;
      }),
    [visibleBlocks, referenceImages.length, deck._id, overlaySeed]
  );

  const paletteSummary = useMemo(
    () => COLOR_KEYS.map(({ key, label }) => ({ key, label, value: colors[key] })),
    [colors]
  );

  return (
    <div className="relative overflow-hidden border border-white/10 bg-[#050505] text-white shadow-[0_35px_120px_rgba(0,0,0,0.45)]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        className="hidden"
      />
      <input
        ref={colorInputRef}
        type="color"
        className="sr-only"
        onChange={(event) => {
          if (editingColor) {
            handleColorChange(editingColor, event.target.value);
          }
        }}
        onBlur={() => setEditingColor(null)}
      />

      <div className="sticky top-0 z-30 border-b border-white/8 bg-[#060606]/96 backdrop-blur-md">
        <div className="border-b border-white/8 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-[2px] bg-white text-black">
                <span className="text-lg font-black">P/</span>
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-[1.7rem] font-semibold tracking-[-0.04em] text-white">
                  PitchCraft
                </h2>
                <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/35">
                  Commercial visual engine
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSidebarOpen((value) => !value)}
                className="rounded-[4px] border border-white/12 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/72 lg:hidden"
              >
                {sidebarOpen ? "Hide edit" : "Show edit"}
              </button>
              <button
                onClick={() => setIsEditing((value) => !value)}
                className={cn(
                  "rounded-[4px] border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors",
                  isEditing
                    ? "border-blue-500/60 bg-blue-500/12 text-blue-300"
                    : "border-white/12 text-white/62 hover:text-white"
                )}
              >
                {isEditing ? "Editing mode" : "Preview mode"}
              </button>
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="rounded-[4px] border border-white/12 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/72 transition-colors hover:text-white"
              >
                Fullscreen
              </button>
              <button
                onClick={() => void exportToPDF()}
                disabled={isExporting}
                className="rounded-[4px] bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-black transition-opacity disabled:opacity-50"
              >
                {isExporting ? "Exporting..." : "Export PDF"}
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6">
          <div className="grid grid-cols-2 gap-2 border border-white/8 bg-white/[0.03] p-1 sm:grid-cols-4">
            {([
              { id: "layout", label: "Layout" },
              { id: "style", label: "Style" },
              { id: "content", label: "Content" },
              { id: "media", label: "Media" },
            ] as const).map((panel) => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={cn(
                  "rounded-[4px] px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.26em] transition-colors",
                  activePanel === panel.id
                    ? "bg-white text-black"
                    : "text-white/38 hover:text-white"
                )}
              >
                {panel.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "border-t border-white/8 bg-[#050505] px-4 py-5 sm:px-6 lg:block",
            sidebarOpen ? "block" : "hidden"
          )}
        >
            {activePanel === "media" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
                    Attach Images
                  </label>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                    {referenceImages.length}/10
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2 lg:grid-cols-10">
                  {Array.from({ length: 10 }).map((_, index) => {
                    const image = referenceImages[index];
                    const isActive = index === activeImageIndex && Boolean(image);

                    return (
                      <div
                        key={index}
                        className={cn(
                          "relative aspect-square overflow-hidden rounded-[4px] border transition-all",
                          image
                            ? isActive
                              ? "border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]"
                              : "border-white/10 hover:border-white/25"
                            : "border-dashed border-white/10 bg-white/[0.03]"
                        )}
                        onClick={() => {
                          if (image) {
                            setActiveImageIndex(index);
                          } else {
                            fileInputRef.current?.click();
                          }
                        }}
                        title={sourceImageTitles[index] || `Slide ${index + 1}`}
                      >
                        {image ? (
                          <div className="group absolute inset-0">
                            <img
                              src={image}
                              alt={`Reference ${index + 1}`}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/55" />
                            {isActive && <div className="absolute left-1 top-1 h-2 w-2 rounded-full bg-amber-400" />}
                            <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.18em] text-white/65">
                              {index + 1}
                            </div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void extractColorsFromImage(index);
                                }}
                                className="rounded-[4px] border border-white/15 bg-white/20 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white"
                              >
                                Extract
                              </button>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeImage(index);
                                }}
                                className="rounded-[4px] border border-red-300/20 bg-red-500/70 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-white/20">
                            <span className="text-lg">+</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="1" variant="soft" color="gray" onClick={() => fileInputRef.current?.click()}>
                    Add images
                  </Button>
                  <Button
                    size="1"
                    variant="soft"
                    color="gray"
                    disabled={!referenceImages[activeImageIndex]}
                    onClick={() => void extractColorsFromImage(activeImageIndex)}
                  >
                    Extract active
                  </Button>
                </div>
              </div>
            )}

            {activePanel === "style" && (
              <div className="space-y-6">
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
                      Typography engine
                    </label>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                      {fontStyle}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {FONT_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setFontStyle(option.id)}
                        className={cn(
                          "border p-4 text-left transition-all",
                          fontStyle === option.id
                            ? "border-white bg-white/10"
                            : "border-white/10 bg-[#111]"
                        )}
                      >
                        <div
                          className="text-[2rem] font-semibold leading-none text-white"
                          style={{ fontFamily: option.previewFamily }}
                        >
                          {option.name}
                        </div>
                        <div className="mt-2 text-[10px] leading-relaxed text-white/35">
                          {option.detail}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
                      Palette presets
                    </label>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                      {styleVariant}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {styleVariants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => applyStylePreset(variant.id)}
                        className={cn(
                          "rounded-[4px] border px-3 py-2 text-[10px] uppercase tracking-[0.22em] transition-colors",
                          styleVariant === variant.id
                            ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
                            : "border-white/10 text-white/55 hover:border-white/20 hover:text-white"
                        )}
                      >
                        {variant.name}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
                        Extracted palette
                      </label>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                        9 tones
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                      {paletteSummary.map(({ key, label, value }) => (
                        <button
                          key={String(key)}
                          className="border border-white/10 bg-[#111] p-3 text-left transition-colors hover:border-white/20"
                          onClick={() => {
                            setEditingColor(key);
                            if (colorInputRef.current) {
                              colorInputRef.current.value = value;
                              colorInputRef.current.click();
                            }
                          }}
                        >
                          <div
                            className="h-10 w-full rounded-[4px] border border-white/10"
                            style={{ backgroundColor: value }}
                          />
                          <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/55">
                            {label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <section className="space-y-3 border border-white/10 bg-[#111] p-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
                        Image overlay
                      </label>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                        {overlayStrength}%
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-white/40">
                      This black gradient is applied to a randomized subset of image sections, so not every page gets the same treatment.
                    </p>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={overlayStrength}
                      onChange={(event) => setOverlayStrength(Number(event.target.value))}
                      className="w-full accent-amber-400"
                    />
                    <Button
                      size="1"
                      variant="soft"
                      color="gray"
                      onClick={() => setOverlaySeed((value) => value + 1)}
                    >
                      Reroll overlay mix
                    </Button>
                  </section>
                </section>
              </div>
            )}

            {activePanel === "content" && (
              <div className="grid gap-3 xl:grid-cols-2">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="border border-white/10 bg-[#111] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.24em] text-amber-200/80">
                        {block.type}
                      </span>
                      <button
                        onClick={() => toggleBlockVisibility(block.id)}
                        className={cn(
                          "rounded-[4px] border px-3 py-1 text-[9px] uppercase tracking-[0.18em]",
                          block.visible
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "border-white/15 text-white/45"
                        )}
                      >
                        {block.visible ? "Visible" : "Hidden"}
                      </button>
                    </div>
                    <input
                      value={block.title}
                      onChange={(event) =>
                        handleBlockUpdate({ ...block, title: event.target.value })
                      }
                      className="w-full border-b border-white/10 bg-transparent pb-2 text-sm font-semibold uppercase tracking-tight text-white outline-none"
                    />
                    <textarea
                      value={block.content}
                      onChange={(event) =>
                        handleBlockUpdate({ ...block, content: event.target.value })
                      }
                      rows={4}
                      className="mt-3 w-full resize-none border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-white/65 outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            {activePanel === "layout" && (
              <div className="space-y-5">
                <section className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">
                    Layout system
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    {LAYOUT_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setLayoutVariant(option.id)}
                        className={cn(
                          "border px-4 py-4 text-left transition-all",
                          layoutVariant === option.id
                            ? "border-white/30 bg-white/[0.07]"
                            : "border-white/10 bg-[#111] hover:border-white/20"
                        )}
                      >
                        <div className="text-sm font-semibold text-white">{option.name}</div>
                        <div className="mt-1 text-[11px] leading-relaxed text-white/45">
                          {option.detail}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="border border-white/10 bg-[#111] p-4 text-[11px] leading-relaxed text-white/45">
                    Drag to reorder. Visibility stays per section, while typography and palette run globally from the Style panel.
                  </div>
                  <div className="grid gap-2 xl:grid-cols-2">
                    {blocks.map((block) => (
                      <div
                        key={block.id}
                        draggable
                        onDragStart={() => handleDragStart(block.id)}
                        onDragOver={(event) => handleDragOver(event, block.id)}
                        onDrop={() => handleDrop(block.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "border bg-[#111] p-4 transition-all",
                          draggedBlock === block.id && "opacity-50",
                          dragOverBlock === block.id
                            ? "border-amber-300/40 bg-amber-300/5"
                            : "border-white/10"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                              {block.type}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-white">
                              {block.title}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleBlockVisibility(block.id)}
                            className={cn(
                              "rounded-[4px] border px-3 py-1 text-[9px] uppercase tracking-[0.18em]",
                              block.visible
                                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                                : "border-white/15 text-white/45"
                            )}
                          >
                            {block.visible ? "Visible" : "Hidden"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2 border-t border-white/8 pt-4">
              <Button
                size="1"
                variant="soft"
                color="gray"
                onClick={resetToDefaults}
              >
                Reset
              </Button>
              {hasUnsavedChanges && (
                <div className="inline-flex items-center border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-amber-300">
                  Unsaved
                </div>
              )}
            </div>
        </div>
      </div>

      <main className="bg-[#060606] px-4 py-4 sm:px-6 sm:py-6">
        <div
          ref={previewRef}
          className="mx-auto w-full max-w-[980px] overflow-hidden border border-white/10 bg-black shadow-[0_24px_90px_rgba(0,0,0,0.48)]"
        >
          {visibleBlocks.length === 0 ? (
            <Card className="m-4 border border-white/10 bg-black/20 p-10 text-center">
              <Text color="gray">No visible blocks. Enable sections from the Layout panel.</Text>
            </Card>
          ) : (
            visibleBlocks.map((block, index) => (
              <Box key={block.id} className="slide-block">
                <DeckSection
                  block={block}
                  index={index}
                  theme="cinematic"
                  colors={colors}
                  imageUrl={referenceImages[index % Math.max(referenceImages.length, 1)] ?? null}
                  referenceImages={referenceImages}
                  imageIndex={index}
                  fontStyle={fontStyle}
                  layoutVariant={layoutVariant}
                  overlayOpacity={overlayAssignments[index] ? overlayStrength : 0}
                  overlayEnabled={overlayAssignments[index]}
                  isEditing={isEditing}
                  onUpdate={handleBlockUpdate}
                  dataGsap={false}
                />
              </Box>
            ))
          )}
        </div>
      </main>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-[120] bg-black/95">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-black/70 px-4 py-4 backdrop-blur-sm sm:px-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">
                Live presentation
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">{deck.title}</h3>
            </div>
            <Button size="1" variant="soft" color="gray" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
          </div>

          <div
            ref={presentationRef}
            className="h-[calc(100vh-78px)] overflow-y-auto snap-y snap-mandatory"
          >
            {visibleBlocks.map((block, index) => (
              <div key={`${block.id}-presentation`} className="slide-block snap-start">
                <DeckSection
                  block={block}
                  index={index}
                  theme="cinematic"
                  colors={colors}
                  imageUrl={referenceImages[index % Math.max(referenceImages.length, 1)] ?? null}
                  referenceImages={referenceImages}
                  imageIndex={index}
                  fontStyle={fontStyle}
                  layoutVariant={layoutVariant}
                  overlayOpacity={overlayAssignments[index] ? overlayStrength : 0}
                  overlayEnabled={overlayAssignments[index]}
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
