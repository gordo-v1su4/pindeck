import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Box, Button, Card, Flex, Text } from "@radix-ui/themes";
import { toast } from "sonner";
import { renderBlock, renderDivider } from "./BlockComponents";
import type {
  BlockData,
  ColorPalette,
  StyleConfig,
  StyleVariant,
} from "./types";
import { cn } from "./utils/cn";
import { defaultColors, extractColors } from "./utils/colorExtractor";
import type { Id } from "../../../convex/_generated/dataModel";

gsap.registerPlugin(ScrollTrigger);

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

type PreviewMode = "html" | "pdf";

const styleVariants: { id: StyleVariant; name: string }[] = [
  { id: "cinematic", name: "Cinematic" },
  { id: "bold", name: "Bold" },
  { id: "minimal", name: "Minimal" },
  { id: "noir", name: "Noir" },
  { id: "neon", name: "Neon" },
];

const stylePresets: Record<StyleVariant, ColorPalette> = {
  cinematic: {
    primary: "#4a6fa5",
    secondary: "#6b8cae",
    accent: "#d4a574",
    dark: "#0d1117",
    light: "#e8e8e8",
  },
  bold: {
    primary: "#e63946",
    secondary: "#f4a261",
    accent: "#2a9d8f",
    dark: "#1a1a2e",
    light: "#ffffff",
  },
  minimal: {
    primary: "#6c757d",
    secondary: "#adb5bd",
    accent: "#212529",
    dark: "#f8f9fa",
    light: "#212529",
  },
  noir: {
    primary: "#2d2d2d",
    secondary: "#4a4a4a",
    accent: "#c9a227",
    dark: "#0a0a0a",
    light: "#d4d4d4",
  },
  neon: {
    primary: "#00d4ff",
    secondary: "#ff00ff",
    accent: "#39ff14",
    dark: "#0a0014",
    light: "#ffffff",
  },
};

const styleConfigs: Record<StyleVariant, StyleConfig> = {
  cinematic: {
    titleSize: "xl",
    titleWeight: "normal",
    titleTracking: "wider",
    bodySize: "md",
    padding: "spacious",
    borders: "none",
    dividerStyle: "gradient",
    overlayIntensity: "heavy",
    showSectionNumbers: false,
    showAccentLines: true,
    showCornerFrames: false,
    letterboxBars: true,
  },
  bold: {
    titleSize: "xl",
    titleWeight: "bold",
    titleTracking: "tight",
    bodySize: "lg",
    padding: "compact",
    borders: "bold",
    dividerStyle: "block",
    overlayIntensity: "light",
    showSectionNumbers: true,
    showAccentLines: false,
    showCornerFrames: false,
    letterboxBars: false,
  },
  minimal: {
    titleSize: "md",
    titleWeight: "light",
    titleTracking: "wide",
    bodySize: "sm",
    padding: "spacious",
    borders: "none",
    dividerStyle: "fade",
    overlayIntensity: "light",
    showSectionNumbers: false,
    showAccentLines: false,
    showCornerFrames: false,
    letterboxBars: false,
  },
  noir: {
    titleSize: "lg",
    titleWeight: "medium",
    titleTracking: "wide",
    bodySize: "md",
    padding: "normal",
    borders: "accent",
    dividerStyle: "line",
    overlayIntensity: "heavy",
    showSectionNumbers: false,
    showAccentLines: true,
    showCornerFrames: true,
    letterboxBars: true,
  },
  neon: {
    titleSize: "xl",
    titleWeight: "bold",
    titleTracking: "normal",
    bodySize: "lg",
    padding: "normal",
    borders: "accent",
    dividerStyle: "geometric",
    overlayIntensity: "medium",
    showSectionNumbers: true,
    showAccentLines: true,
    showCornerFrames: true,
    letterboxBars: false,
  },
};

const templateBlocks: BlockData[] = [
  {
    id: "1",
    type: "hero",
    title: "PROJECT TITLE",
    content: "A CINEMATIC EXPERIENCE",
    layout: "A",
    visible: true,
  },
  {
    id: "2",
    type: "logline",
    title: "LOGLINE",
    content:
      "When an ordinary world collides with extraordinary circumstances, one character must face the impossible choice between what they want and what they need.",
    layout: "A",
    visible: true,
  },
  {
    id: "3",
    type: "story",
    title: "STORY",
    content:
      "In a world where nothing is as it seems, our protagonist discovers a hidden truth that challenges everything they believed.",
    layout: "A",
    visible: true,
  },
  {
    id: "4",
    type: "world",
    title: "WORLD & CONCEPT",
    content:
      "The rules are simple yet devastating: every choice has consequences that ripple through time.",
    layout: "A",
    visible: true,
  },
  {
    id: "5",
    type: "character",
    title: "CHARACTER",
    content:
      "A central figure carries the weight of a past they cannot escape.",
    layout: "A",
    visible: true,
  },
  {
    id: "6",
    type: "tone",
    title: "TONE & STYLE",
    content:
      "Atmospheric and immersive. Muted palette with bursts of visceral color.",
    layout: "A",
    visible: true,
  },
  {
    id: "7",
    type: "motif",
    title: "VISUAL MOTIFS",
    content:
      "Reflections, liminal spaces, and environmental contrast build visual continuity.",
    layout: "A",
    visible: true,
  },
  {
    id: "8",
    type: "theme",
    title: "THEMES",
    content: "Identity, consequence, and transformation.",
    layout: "A",
    visible: true,
  },
  {
    id: "9",
    type: "stakes",
    title: "STAKES",
    content:
      "If the protagonist fails, the personal conflict expands into wider collapse.",
    layout: "A",
    visible: true,
  },
  {
    id: "10",
    type: "closing",
    title: "CLOSING",
    content: "In the end, we become what we choose to remember.",
    layout: "A",
    visible: true,
  },
];

function buildDeckBlocks(deckTitle: string, imageTitles: string[]): BlockData[] {
  const [a, b, c, d, e, f, g, h, i, j] = imageTitles;

  return templateBlocks.map((block) => {
    if (block.type === "hero") {
      return {
        ...block,
        title: (deckTitle || "DECK").toUpperCase(),
      };
    }

    if (block.type === "logline" && b) {
      return {
        ...block,
        content: `A visual narrative built from "${b}" and related imagery.`,
      };
    }

    if (block.type === "story" && c) {
      return {
        ...block,
        content: `The sequence expands from "${c}" into progression, tension, and release.`,
      };
    }

    if (block.type === "world" && d) {
      return {
        ...block,
        content: `The setting language is anchored by "${d}" with strong atmosphere and production cues.`,
      };
    }

    if (block.type === "character" && e) {
      return {
        ...block,
        content: `Character framing is led by "${e}", with emphasis on silhouette and emotional beat.`,
      };
    }

    if (block.type === "tone" && f) {
      return {
        ...block,
        content: `Tone references are pulled from "${f}" with cinematic contrast and controlled palette.`,
      };
    }

    if (block.type === "motif" && g) {
      return {
        ...block,
        content: `Recurring motifs originate from "${g}" and repeat across sequence beats.`,
      };
    }

    if (block.type === "theme" && h) {
      return {
        ...block,
        content: `Themes suggested by "${h}": identity, consequence, and transformation.`,
      };
    }

    if (block.type === "stakes" && i) {
      return {
        ...block,
        content: `Stakes escalate around "${i}" from personal conflict to larger impact.`,
      };
    }

    if (block.type === "closing") {
      return {
        ...block,
        content: j
          ? `Closing image cue: "${j}".`
          : `Closing image cue: "${a || deckTitle}".`,
      };
    }

    return block;
  });
}

export function DeckComposer({ deck }: { deck: DeckDetail }) {
  const sourceSlides = useMemo(
    () => [...deck.slides].sort((a, b) => a.order - b.order),
    [deck.slides]
  );

  const sourceImages = useMemo(
    () => sourceSlides.map((s) => s.image?.imageUrl).filter((v): v is string => Boolean(v)),
    [sourceSlides]
  );

  const sourceImageTitles = useMemo(
    () => sourceSlides.map((s) => s.image?.title || ""),
    [sourceSlides]
  );

  const storageKey = useMemo(
    () => `pindeck-deck-state:${deck._id}`,
    [deck._id]
  );

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
  const [previewMode, setPreviewMode] = useState<PreviewMode>("html");
  const [imageOverlay, setImageOverlay] = useState<number>(55);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const htmlPreviewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const resetToDeckDefaults = useCallback(() => {
    setReferenceImages(sourceImages.slice(0, 10));
    setActiveImageIndex(0);
    setBlocks(buildDeckBlocks(deck.title, sourceImageTitles));
    setStyleVariant("cinematic");
    setColors(stylePresets.cinematic);
    setImageOverlay(55);
    setPreviewMode("html");
  }, [sourceImages, deck.title, sourceImageTitles]);

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
      setColors(saved.colors ?? stylePresets.cinematic);
      setBlocks(saved.blocks ?? buildDeckBlocks(deck.title, sourceImageTitles));
      setStyleVariant(saved.styleVariant ?? "cinematic");
      setImageOverlay(typeof saved.imageOverlay === "number" ? saved.imageOverlay : 55);
      setPreviewMode(saved.previewMode === "pdf" ? "pdf" : "html");
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
            referenceImages,
            activeImageIndex,
            colors,
            blocks,
            styleVariant,
            imageOverlay,
            previewMode,
          })
        );
        setHasUnsavedChanges(false);
      } catch {
        // no-op
      }
    }, 600);

    setHasUnsavedChanges(true);
    return () => clearTimeout(timer);
  }, [
    storageKey,
    referenceImages,
    activeImageIndex,
    colors,
    blocks,
    styleVariant,
    imageOverlay,
    previewMode,
  ]);

  useEffect(() => {
    if (referenceImages.length === 0) {
      setColors(stylePresets[styleVariant] ?? defaultColors);
      return;
    }

    let alive = true;
    const run = async () => {
      try {
        const extracted = await extractColors(referenceImages[0]);
        if (alive) setColors(extracted);
      } catch {
        if (alive) setColors(stylePresets[styleVariant] ?? defaultColors);
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [deck._id]);

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
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
          reader.onload = (e) => resolve(String(e.target?.result ?? ""));
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
            setColors(extracted);
          } catch {
            // ignore extraction failure
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

  const removeImage = useCallback((index: number) => {
    setReferenceImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (activeImageIndex >= next.length) {
        setActiveImageIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
    toast.info("Image removed");
  }, [activeImageIndex]);

  const extractColorsFromImage = useCallback(
    async (index: number) => {
      const imageUrl = referenceImages[index];
      if (!imageUrl) return;
      try {
        const extracted = await extractColors(imageUrl);
        setColors(extracted);
        toast.success("Colors extracted");
      } catch {
        toast.error("Failed to extract colors");
      }
    },
    [referenceImages]
  );

  const handleColorChange = useCallback(
    (key: keyof ColorPalette, value: string) => {
      setColors((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const applyStylePreset = useCallback((variant: StyleVariant) => {
    setStyleVariant(variant);
    if (referenceImages.length === 0) {
      setColors(stylePresets[variant]);
    }
    toast.info(`${variant} style applied`);
  }, [referenceImages.length]);

  const handleBlockUpdate = useCallback((updated: BlockData) => {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }, []);

  const toggleBlockLayout = useCallback((blockId: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, layout: b.layout === "A" ? "B" : "A" } : b
      )
    );
  }, []);

  const toggleBlockVisibility = useCallback((blockId: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, visible: !b.visible } : b))
    );
  }, []);

  const setAllLayouts = useCallback((layout: "A" | "B") => {
    setBlocks((prev) => prev.map((b) => ({ ...b, layout })));
    toast.success(`All blocks set to Layout ${layout}`);
  }, []);

  const handleDragStart = useCallback((blockId: string) => {
    setDraggedBlock(blockId);
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent, blockId: string) => {
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

      setBlocks((prev) => {
        const draggedIndex = prev.findIndex((b) => b.id === draggedBlock);
        const targetIndex = prev.findIndex((b) => b.id === targetBlockId);
        if (draggedIndex < 0 || targetIndex < 0) return prev;

        const reordered = [...prev];
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
        const item = slide as HTMLElement;
        if (item.offsetHeight > 100) {
          contentSlides.push(item);
        }
      });

      if (contentSlides.length === 0) {
        toast.error("No slides to export");
        setIsExporting(false);
        return;
      }

      const pageWidth = 1920;
      const pageHeight = 1080;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [pageWidth, pageHeight],
      });

      for (let i = 0; i < contentSlides.length; i += 1) {
        const slide = contentSlides[i];

        const originalOpacity = slide.style.opacity;
        const originalTransform = slide.style.transform;
        const originalFilter = slide.style.filter;

        slide.style.opacity = "1";
        slide.style.transform = "none";
        slide.style.filter = "none";

        await new Promise((resolve) => setTimeout(resolve, 50));

        const canvas = await html2canvas(slide, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: colors.dark,
          logging: false,
          width: slide.offsetWidth,
          height: slide.offsetHeight,
        });

        slide.style.opacity = originalOpacity;
        slide.style.transform = originalTransform;
        slide.style.filter = originalFilter;

        const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
        const finalWidth = canvas.width * ratio;
        const finalHeight = canvas.height * ratio;
        const x = (pageWidth - finalWidth) / 2;
        const y = (pageHeight - finalHeight) / 2;

        if (i > 0) {
          pdf.addPage([pageWidth, pageHeight], "landscape");
        }

        pdf.setFillColor(colors.dark);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        const imgData = canvas.toDataURL("image/png", 1.0);
        pdf.addImage(imgData, "PNG", x, y, finalWidth, finalHeight);
      }

      pdf.save(`${deck.title || "pitch-deck"}.pdf`);
      toast.success(`PDF exported (${contentSlides.length} pages)`);
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  }, [colors.dark, deck.title]);

  const exportToImage = useCallback(async () => {
    if (!previewRef.current) return;

    setIsExporting(true);
    toast.info("Generating PNG...");

    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: colors.dark,
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `${deck.title || "pitch-deck"}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
      toast.success("PNG exported successfully");
    } catch {
      toast.error("Failed to export PNG");
    } finally {
      setIsExporting(false);
    }
  }, [colors.dark, deck.title]);

  const visibleBlocks = blocks.filter((b) => b.visible);

  useEffect(() => {
    if (previewMode !== "html") {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      return;
    }

    const timeout = setTimeout(() => {
      const container = htmlPreviewRef.current;
      if (!container) return;

      const slides = container.querySelectorAll(".slide-block");
      if (!slides.length) return;

      slides.forEach((slide) => {
        gsap.set(slide, { opacity: 1, y: 0, scale: 1, rotateX: 0 });
      });

      slides.forEach((slide, index) => {
        const isEven = index % 2 === 0;
        const isThird = index % 3 === 0;

        let fromVars: gsap.TweenVars;
        let toVars: gsap.TweenVars;

        if (index === 0) {
          fromVars = { opacity: 0, scale: 0.85, y: 30 };
          toVars = { opacity: 1, scale: 1, y: 0, duration: 1.2, ease: "power4.out" };
        } else if (isThird) {
          fromVars = { opacity: 0, x: isEven ? -60 : 60 };
          toVars = { opacity: 1, x: 0, duration: 0.8, ease: "power3.out" };
        } else {
          fromVars = { opacity: 0, y: 50 };
          toVars = { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" };
        }

        gsap.fromTo(slide, fromVars, {
          ...toVars,
          scrollTrigger: {
            trigger: slide,
            start: "top 85%",
            end: "top 20%",
            toggleActions: "play none none reverse",
            scrub: index === 0 ? false : 0.3,
          },
        });

        const bgImage = slide.querySelector('[style*="background-image"]');
        if (bgImage) {
          gsap.fromTo(
            bgImage,
            { yPercent: -8 },
            {
              yPercent: 8,
              ease: "none",
              scrollTrigger: {
                trigger: slide,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            }
          );
        }
      });
    }, 150);

    return () => {
      clearTimeout(timeout);
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [previewMode, blocks, visibleBlocks.length]);

  return (
    <div className="relative min-h-[75vh] bg-[#0a0a0a] text-white rounded-md border border-white/10 overflow-hidden">
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="lg:hidden fixed bottom-5 right-5 z-30 p-3 bg-[#0c0c0c] border border-white/10"
        title="Toggle deck controls"
      >
        <svg
          className="w-4 h-4 text-white/80"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {sidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-0">
        <div
          className={cn(
            "bg-[#0c0c0c] border-r border-white/10 h-full overflow-y-auto",
            sidebarOpen ? "block" : "hidden lg:block"
          )}
        >
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-2xl tracking-wide">PITCH DECK</h2>
                <p className="text-[10px] text-white/40 tracking-[0.2em] uppercase">
                  {deck.boardName ? `From ${deck.boardName}` : "Builder"}
                </p>
              </div>
              {hasUnsavedChanges && (
                <span className="text-[10px] text-amber-400 tracking-wide">Unsaved</span>
              )}
            </div>
          </div>

          <div className="p-4 sidebar-section">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] text-white/50 uppercase tracking-[0.15em]">Images</label>
              <span className="text-[10px] text-white/30">{referenceImages.length}/10</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />

            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 10 }).map((_, index) => {
                const image = referenceImages[index];
                const isActive = index === activeImageIndex && image;

                return (
                  <div
                    key={index}
                    className={cn(
                      "image-slot aspect-square border relative overflow-hidden cursor-pointer",
                      image
                        ? isActive
                          ? "border-amber-500"
                          : "border-white/10 hover:border-white/20"
                        : "image-slot-empty border-dashed border-white/10"
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
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors" />

                        {isActive && (
                          <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-amber-500" />
                        )}

                        <div className="absolute bottom-0 right-0 text-[7px] text-white/60 bg-black/60 px-0.5">
                          {index + 1}
                        </div>

                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void extractColorsFromImage(index);
                            }}
                            className="w-5 h-5 bg-white/30 flex items-center justify-center hover:bg-amber-500 transition-colors text-white"
                            title="Extract colors"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(index);
                            }}
                            className="w-5 h-5 bg-white/30 flex items-center justify-center hover:bg-red-500 transition-colors text-white"
                            title="Remove"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              size="1"
              variant="soft"
              color="gray"
              className="mt-3"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Images
            </Button>
          </div>

          <div className="p-4 sidebar-section">
            <label className="text-[10px] text-white/50 uppercase tracking-[0.15em] mb-3 block">Colors</label>
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

            <div className="flex gap-1.5">
              {(Object.entries(colors) as [keyof ColorPalette, string][]).map(([key, color]) => (
                <div key={key} className="flex flex-col items-center flex-1">
                  <button
                    className={cn(
                      "color-swatch w-full aspect-square cursor-pointer relative border",
                      editingColor === key
                        ? "border-white"
                        : "border-transparent hover:border-white/30"
                    )}
                    style={{ backgroundColor: color }}
                    title={`${key}: ${color}`}
                    onClick={() => {
                      setEditingColor(key);
                      if (colorInputRef.current) {
                        colorInputRef.current.value = color;
                        colorInputRef.current.click();
                      }
                    }}
                  />
                  <span className="text-[8px] text-white/40 mt-1 uppercase tracking-wide">{key.slice(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 sidebar-section">
            <label className="text-[10px] text-white/50 uppercase tracking-[0.15em] mb-3 block">Style Preset</label>
            <div className="grid grid-cols-2 gap-1.5">
              {styleVariants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => applyStylePreset(variant.id)}
                  className={cn(
                    "px-2 py-1 text-[10px] tracking-wide uppercase border transition-colors",
                    styleVariant === variant.id
                      ? "bg-amber-500 text-black border-amber-500"
                      : "bg-transparent text-white/70 border-white/15 hover:border-white/30"
                  )}
                >
                  {variant.name}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sidebar-section">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] text-white/50 uppercase tracking-[0.15em]">Image Overlay</label>
              <span className="text-[10px] text-white/40">{imageOverlay}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={imageOverlay}
              onChange={(event) => setImageOverlay(Number(event.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          <div className="p-4 sidebar-section">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] text-white/50 uppercase tracking-[0.15em]">Blocks</label>
              <span className="text-[10px] text-white/30">Drag to reorder</span>
            </div>

            <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => handleDragStart(block.id)}
                  onDragOver={(event) => handleDragOver(event, block.id)}
                  onDrop={() => handleDrop(block.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "block-card p-2 border bg-black/20 cursor-move",
                    draggedBlock === block.id && "opacity-50",
                    dragOverBlock === block.id && "border-amber-400",
                    dragOverBlock !== block.id && "border-white/10"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-white/70">
                        {block.type}
                      </p>
                      <p className="text-[9px] text-white/35">Layout {block.layout}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleBlockVisibility(block.id)}
                        className={cn(
                          "px-2 py-0.5 text-[9px] border",
                          block.visible
                            ? "text-emerald-300 border-emerald-700/60"
                            : "text-white/40 border-white/20"
                        )}
                        title="Toggle visibility"
                      >
                        {block.visible ? "ON" : "OFF"}
                      </button>
                      <button
                        onClick={() => toggleBlockLayout(block.id)}
                        className="px-2 py-0.5 text-[9px] border text-white/70 border-white/20"
                        title="Toggle layout"
                      >
                        {block.layout}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-3">
              <button
                onClick={() => setAllLayouts("A")}
                className="px-2 py-1 text-[10px] uppercase tracking-wide border border-white/20 text-white/70 hover:border-white/30"
              >
                All Layout A
              </button>
              <button
                onClick={() => setAllLayouts("B")}
                className="px-2 py-1 text-[10px] uppercase tracking-wide border border-white/20 text-white/70 hover:border-white/30"
              >
                All Layout B
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={resetToDefaults}
                className="px-2 py-1 text-[10px] uppercase tracking-wide border border-white/20 text-white/70 hover:border-white/30"
              >
                Reset
              </button>
              <button
                onClick={() => setIsEditing((v) => !v)}
                className={cn(
                  "px-2 py-1 text-[10px] uppercase tracking-wide border",
                  isEditing
                    ? "border-amber-500 text-amber-300"
                    : "border-white/20 text-white/70 hover:border-white/30"
                )}
              >
                {isEditing ? "Editing On" : "Editing Off"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#0a0a0a] min-h-[75vh] overflow-hidden">
          <div className="p-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div>
              <Text size="4" weight="bold" className="font-display tracking-wide">
                {deck.title}
              </Text>
              <Text size="1" color="gray" className="block mt-1 uppercase tracking-[0.15em]">
                {deck.boardName ? `Source Board: ${deck.boardName}` : "Generated Deck"}
              </Text>
            </div>

            <Flex gap="2" wrap="wrap">
              <Button
                size="1"
                variant={previewMode === "html" ? "solid" : "soft"}
                color={previewMode === "html" ? "blue" : "gray"}
                onClick={() => setPreviewMode("html")}
              >
                HTML Preview
              </Button>
              <Button
                size="1"
                variant={previewMode === "pdf" ? "solid" : "soft"}
                color={previewMode === "pdf" ? "blue" : "gray"}
                onClick={() => setPreviewMode("pdf")}
              >
                PDF Mode
              </Button>
              <Button size="1" variant="soft" color="teal" disabled={isExporting} onClick={() => void exportToPDF()}>
                {isExporting ? "Exporting..." : "Export PDF"}
              </Button>
              <Button size="1" variant="soft" color="teal" disabled={isExporting} onClick={() => void exportToImage()}>
                Export PNG
              </Button>
            </Flex>
          </div>

          <div ref={previewRef} className="h-[calc(100vh-280px)] overflow-y-auto p-4">
            <div ref={htmlPreviewRef} className="space-y-0">
              {visibleBlocks.length === 0 ? (
                <Card className="p-10 text-center bg-black/20 border border-white/10">
                  <Text color="gray">No visible blocks. Enable blocks from the sidebar.</Text>
                </Card>
              ) : (
                visibleBlocks.map((block, index) => (
                  <Box key={block.id} className="slide-block">
                    {renderBlock(
                      block,
                      colors,
                      referenceImages,
                      isEditing,
                      handleBlockUpdate,
                      styleConfigs[styleVariant],
                      styleVariant,
                      imageOverlay
                    )}
                    {index < visibleBlocks.length - 1 &&
                      renderDivider(colors, styleConfigs[styleVariant], styleVariant)}
                  </Box>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
