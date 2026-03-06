import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Download,
  Eye,
  FileCode,
  GripVertical,
  Layout,
  Move,
  Palette,
  Plus,
  Upload,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type ThemeMode = "cinematic" | "minimal";
type LayoutMode = "A" | "B";
type BlockType =
  | "hero"
  | "logline"
  | "story"
  | "world"
  | "character"
  | "tone"
  | "motif"
  | "theme"
  | "stakes"
  | "closing";

type SupplementalType = "character" | "moodboard" | "visual" | "reference";

interface Block {
  id: BlockType;
  label: string;
  title: string;
  body: string;
  subtitle?: string;
  imageIds: string[];
}

interface SupplementalImage {
  id: string;
  type: SupplementalType;
  url: string;
  name: string;
}

interface PaletteState {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
}

const defaultBlocks: Block[] = [
  {
    id: "hero",
    label: "TITLE / HERO",
    title: "PROJECT TITLE",
    subtitle: "A COMMERCIAL FILM PROPOSAL",
    body: "Immediate identity, emotional pressure, and visual tone.",
    imageIds: [],
  },
  {
    id: "logline",
    label: "LOGLINE",
    title: "HOOK",
    body: "A one-hit premise that signals scale, emotion, and a new cinematic space.",
    imageIds: [],
  },
  {
    id: "story",
    label: "STORY / SYNOPSIS",
    title: "WHO CHANGES, WHAT BREAKS",
    body: "A compact narrative beat: who we follow, what shifts, and the consequence if they fail.",
    imageIds: [],
  },
  {
    id: "world",
    label: "WORLD / CONCEPT",
    title: "THE ENGINE",
    body: "Rules of this universe and the core mechanic powering every scene.",
    imageIds: [],
  },
  {
    id: "character",
    label: "CHARACTER FOCUS",
    title: "THE FACE OF THE IDEA",
    body: "Age, attitude, contradiction. A hero that carries the campaign emotionally.",
    imageIds: [],
  },
  {
    id: "tone",
    label: "TONE / STYLE",
    title: "TASTE SIGNAL",
    body: "Reference language for camera, grade, and emotional temperature.",
    imageIds: [],
  },
  {
    id: "motif",
    label: "VISUAL MOTIF",
    title: "RECURRING SYMBOLS",
    body: "Textures, objects, and repeatable visual signatures that create cohesion.",
    imageIds: [],
  },
  {
    id: "theme",
    label: "THEMATIC STATEMENT",
    title: "WHAT IT IS REALLY ABOUT",
    body: "This piece is about the cost of control and the freedom inside uncertainty.",
    imageIds: [],
  },
  {
    id: "stakes",
    label: "ESCALATION / STAKES",
    title: "WHY IT MATTERS",
    body: "Failure expands from personal consequence to brand, social, and cultural impact.",
    imageIds: [],
  },
  {
    id: "closing",
    label: "CLOSING IMPACT",
    title: "FINAL AFTERTASTE",
    body: "One final image-line pair that lingers after the deck is closed.",
    imageIds: [],
  },
];

const defaultPalette: PaletteState = {
  primary: "rgb(157, 154, 116)",
  secondary: "rgb(74, 111, 120)",
  accent: "rgb(223, 191, 78)",
  bg: "#080a0c",
  surface: "#11151a",
  text: "#f4f5f5",
  muted: "#9fa7ad",
};

const luminance = (color: string) => {
  const rgb = color.match(/\d+/g);
  if (!rgb) return 255;
  const [r, g, b] = rgb.map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const brightenRgb = (color: string, amount = 28) => {
  const rgb = color.match(/\d+/g);
  if (!rgb) return color;
  const [r, g, b] = rgb.map(Number);
  return `rgb(${Math.min(255, r + amount)}, ${Math.min(255, g + amount)}, ${Math.min(255, b + amount)})`;
};

const extractPalette = async (url: string): Promise<PaletteState> => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return defaultPalette;

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bins: Record<string, number> = {};

  for (let i = 0; i < data.length; i += 32) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = (r + g + b) / 3;
    if (l < 12 || l > 242) continue;
    const key = `${Math.round(r / 24) * 24},${Math.round(g / 24) * 24},${Math.round(b / 24) * 24}`;
    bins[key] = (bins[key] || 0) + 1;
  }

  const top = Object.entries(bins)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k);
  const [primary = "140,140,120", secondary = "70,95,115", accent = "200,160,80"] = top;

  return {
    primary: `rgb(${primary})`,
    secondary: `rgb(${secondary})`,
    accent: `rgb(${accent})`,
    bg: "#07090b",
    surface: "#12171d",
    text: "#f5f7f8",
    muted: "#9aa3ac",
  };
};

function ColorChip({ color }: { color: string }) {
  const dark = luminance(color) < 28;
  const borderColor = dark ? brightenRgb(color, 42) : "transparent";
  return (
    <span
      className="inline-block h-7 w-7"
      style={{
        background: color,
        border: `1px solid ${borderColor}`,
        boxShadow: dark ? `0 0 0 1px ${brightenRgb(color, 22)}55` : "none",
      }}
    />
  );
}

function SortableSection({
  block,
  index,
  layout,
  theme,
  palette,
  heroImage,
  supplemental,
  editing,
  onSelect,
  selected,
}: {
  block: Block;
  index: number;
  layout: LayoutMode;
  theme: ThemeMode;
  palette: PaletteState;
  heroImage: string | null;
  supplemental: SupplementalImage[];
  editing: boolean;
  onSelect: (id: BlockType) => void;
  selected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: !editing,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  const blockImages = supplemental.filter((item) => block.imageIds.includes(item.id));
  const activeImage = blockImages[0]?.url || heroImage;

  const fontClass =
    layout === "A"
      ? theme === "cinematic"
        ? "font-cinematic"
        : "font-minimal"
      : theme === "cinematic"
      ? "font-editorial"
      : "font-condensed";

  const isCinematic = theme === "cinematic";
  const bodySize = isCinematic ? "text-sm md:text-base" : "text-sm md:text-base leading-relaxed";
  const sectionHeight = "min-h-[56.25vw] md:min-h-[540px]";

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
  };

  const titleClass = isCinematic ? cinematicSizes[block.id] : minimalSizes[block.id];

  return (
    <section
      ref={setNodeRef}
      style={style}
      data-anim="section"
      className={`relative border-b border-white/10 ${sectionHeight} ${selected ? "ring-1 ring-offset-0" : ""}`}
      onClick={() => onSelect(block.id)}
    >
      {editing && (
        <button
          {...attributes}
          {...listeners}
          className="absolute left-2 top-2 z-30 bg-black/60 p-1"
          aria-label="drag"
        >
          <GripVertical className="h-4 w-4 text-white" />
        </button>
      )}

      {layout === "A" ? (
        <div className="relative grid h-full md:grid-cols-12">
          <div className={`relative ${index % 2 === 0 ? "md:col-span-8" : "md:col-span-6 md:order-2"}`}>
            {activeImage ? (
              <img src={activeImage} alt="reference" className="h-full w-full object-cover opacity-70" data-anim="image" />
            ) : (
              <div className="h-full w-full" style={{ background: palette.surface }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/35 to-transparent" />
          </div>
          <div
            className={`relative flex ${index % 2 === 0 ? "md:col-span-4" : "md:col-span-6 md:order-1"} ${block.id === "hero" ? "items-end" : index % 3 === 0 ? "items-center" : "items-start"}`}
            style={{ background: `${palette.bg}f0` }}
          >
            <div className={`w-full ${block.id === "hero" ? "p-6 md:p-12" : block.id === "theme" ? "p-10 md:p-16" : "p-6 md:p-10"}`}>
              <p className="mb-3 text-[10px] tracking-[0.32em] text-white/70">{block.label}</p>
              <h2
                className={`${fontClass} ${titleClass} ${isCinematic ? "leading-[0.84]" : "leading-[1.02]"}`}
                style={{ color: block.id === "hero" || block.id === "stakes" ? palette.accent : palette.text }}
                data-anim="title"
              >
                {block.title}
              </h2>
              <p className={`${bodySize} mt-4 ${block.id === "logline" ? "max-w-[30ch]" : "max-w-[44ch]"}`} style={{ color: palette.muted }}>
                {block.body}
              </p>
            </div>
            <span className="absolute left-0 top-0 h-full w-[5px]" style={{ background: index % 2 ? palette.secondary : palette.primary }} />
            {block.id === "hero" && (
              <span
                className="absolute right-4 top-4 border px-2 py-1 text-[10px] uppercase tracking-[0.28em]"
                style={{ borderColor: palette.accent, color: palette.accent }}
              >
                Option A
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="relative h-full overflow-hidden">
          <div className="absolute inset-0" style={{ background: `linear-gradient(145deg, ${palette.bg}, ${palette.surface})` }} />
          {activeImage && (
            <img
              src={activeImage}
              alt="reference"
              className={`absolute object-cover ${index % 2 === 0 ? "right-0 top-0 h-full w-[68%]" : "left-0 top-0 h-full w-[68%]"} opacity-35`}
              data-anim="image"
            />
          )}
          <div className="absolute inset-0 bg-black/55" />

          <div className="relative z-10 mx-auto flex h-full max-w-6xl items-center p-6 md:p-12">
            <div
              className={`${index % 2 === 0 ? "ml-auto" : ""} ${block.id === "theme" || block.id === "closing" ? "max-w-2xl" : "max-w-3xl"} border border-white/15 p-6 md:p-10`}
              style={{ background: "rgba(8, 10, 14, 0.72)", backdropFilter: "blur(3px)" }}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] tracking-[0.3em] text-white/70">{block.label}</p>
                <div className="flex gap-1.5">
                  {[palette.primary, palette.secondary, palette.accent].map((swatch) => (
                    <ColorChip key={swatch} color={swatch} />
                  ))}
                </div>
              </div>
              <h2
                className={`${fontClass} ${titleClass} ${isCinematic ? "tracking-tight" : "tracking-wide"}`}
                style={{ color: palette.text }}
                data-anim="title"
              >
                {block.title}
              </h2>
              <p className={`${bodySize} mt-4 max-w-[58ch]`} style={{ color: palette.muted }}>
                {block.body}
              </p>
              {block.subtitle && (
                <p className="mt-3 text-xs tracking-[0.24em]" style={{ color: palette.accent }}>
                  {block.subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const htmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function App() {
  const [blocks, setBlocks] = useState<Block[]>(defaultBlocks);
  const [theme, setTheme] = useState<ThemeMode>("cinematic");
  const [layout, setLayout] = useState<LayoutMode>("A");
  const [palette, setPalette] = useState<PaletteState>(defaultPalette);
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [supplemental, setSupplemental] = useState<SupplementalImage[]>([]);
  const [editing, setEditing] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<BlockType>("hero");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [htmlPreviewOpen, setHtmlPreviewOpen] = useState(false);

  const deckRef = useRef<HTMLDivElement>(null);
  const htmlFrameRef = useRef<HTMLIFrameElement>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const selected = blocks.find((block) => block.id === selectedBlock);
  const sectionIds = useMemo(() => blocks.map((b) => b.id), [blocks]);

  const onImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const url = reader.result as string;
      setHeroImage(url);
      const picked = await extractPalette(url);
      setPalette(picked);
    };
    reader.readAsDataURL(file);
  };

  const onSupplementalUpload = (type: SupplementalType, files: FileList | null) => {
    if (!files) return;
    const nextFiles = Array.from(files);
    nextFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const next: SupplementalImage = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          type,
          url: reader.result as string,
          name: file.name,
        };
        setSupplemental((prev) => [...prev, next]);
      };
      reader.readAsDataURL(file);
    });
  };

  const assignImage = (imageId: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlock
          ? {
              ...block,
              imageIds: block.imageIds.includes(imageId)
                ? block.imageIds.filter((id) => id !== imageId)
                : [...block.imageIds, imageId],
            }
          : block,
      ),
    );
  };

  const updateSelectedBlock = (patch: Partial<Block>) => {
    setBlocks((prev) => prev.map((block) => (block.id === selectedBlock ? { ...block, ...patch } : block)));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((item) => item.id === active.id);
    const newIndex = blocks.findIndex((item) => item.id === over.id);
    setBlocks((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const generateHtmlDeck = () => {
    const titleScaleCinematic: Record<BlockType, string> = {
      hero: "clamp(64px, 15vw, 176px)",
      logline: "clamp(42px, 8.5vw, 108px)",
      story: "clamp(34px, 7vw, 92px)",
      world: "clamp(52px, 10vw, 132px)",
      character: "clamp(46px, 9vw, 118px)",
      tone: "clamp(36px, 7.2vw, 96px)",
      motif: "clamp(40px, 8vw, 104px)",
      theme: "clamp(32px, 6.5vw, 88px)",
      stakes: "clamp(54px, 11vw, 140px)",
      closing: "clamp(42px, 8.8vw, 110px)",
    };
    const titleScaleMinimal: Record<BlockType, string> = {
      hero: "clamp(44px, 9vw, 100px)",
      logline: "clamp(26px, 4.8vw, 58px)",
      story: "clamp(24px, 4.2vw, 52px)",
      world: "clamp(30px, 5.6vw, 68px)",
      character: "clamp(28px, 5.2vw, 64px)",
      tone: "clamp(24px, 4.4vw, 54px)",
      motif: "clamp(30px, 5.4vw, 66px)",
      theme: "clamp(24px, 4.2vw, 52px)",
      stakes: "clamp(34px, 6.2vw, 74px)",
      closing: "clamp(28px, 5vw, 62px)",
    };

    const sectionMarkup = blocks
      .map((block, index) => {
        const img = supplemental.find((s) => block.imageIds.includes(s.id))?.url || heroImage;
        const titleSize = theme === "cinematic" ? titleScaleCinematic[block.id] : titleScaleMinimal[block.id];
        return `
        <section class="deck-section ${layout === "A" ? "layout-a" : "layout-b"} ${index % 2 ? "flip" : ""}" data-gsap="section" data-block="${block.id}">
          ${img ? `<img class="bg-image" src="${img}" alt="reference" data-gsap="image"/>` : ""}
          <div class="overlay"></div>
          <div class="content">
            <p class="label">${htmlEscape(block.label)}</p>
            <h2 class="title" style="font-size:${titleSize}">${htmlEscape(block.title)}</h2>
            <p class="body">${htmlEscape(block.body)}</p>
          </div>
        </section>`;
      })
      .join("\n");

    const family = layout === "A" ? (theme === "cinematic" ? "'Oswald', sans-serif" : "'Manrope', sans-serif") : theme === "cinematic" ? "'Fraunces', serif" : "'Barlow Condensed', sans-serif";
    const titleWeight = theme === "cinematic" ? 900 : 350;
    const titleTransform = theme === "cinematic" ? "uppercase" : "none";

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Pitch Deck Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;600;800&family=Fraunces:opsz,wght@9..144,300;9..144,700&family=Manrope:wght@300;500;800&family=Oswald:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: ${palette.bg};
      --surface: ${palette.surface};
      --text: ${palette.text};
      --muted: ${palette.muted};
      --accent: ${palette.accent};
      --primary: ${palette.primary};
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: ${family}; }
    .deck-section {
      position: relative;
      min-height: 56.25vw;
      max-height: 760px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      overflow: hidden;
      display: flex;
      align-items: flex-end;
    }
    .layout-b { align-items: center; }
    .layout-a .content { width: min(45%, 560px); margin: 0 0 0 auto; border-left: 5px solid var(--primary); background: rgba(6,8,12,.82); }
    .layout-a.flip .content { margin: 0 auto 0 0; border-left: 0; border-right: 5px solid var(--secondary); }
    .layout-b .content { width: min(62%, 820px); border: 1px solid rgba(255,255,255,.16); background: rgba(8,10,14,.72); }
    .layout-b.flip .content { margin-left: auto; }
    .bg-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .45; }
    .overlay { position: absolute; inset: 0; background: linear-gradient(110deg, rgba(0,0,0,.78), rgba(0,0,0,.35)); }
    .content { position: relative; z-index: 2; padding: 32px; max-width: 980px; }
    .label { letter-spacing: .28em; font-size: 11px; color: var(--muted); }
    .title {
      margin: 8px 0 10px;
      line-height: .94;
      font-size: clamp(34px, 8vw, 112px);
      color: ${layout === "A" ? "var(--accent)" : "var(--text)"};
      font-weight: ${titleWeight};
      text-transform: ${titleTransform};
    }
    .body { margin: 0; max-width: 60ch; color: var(--muted); }
    [data-block="hero"] .title { letter-spacing: ${theme === "cinematic" ? "0.02em" : "0.08em"}; }
    [data-block="logline"] .body, [data-block="theme"] .body { max-width: 42ch; }
    [data-block="stakes"] .title, [data-block="world"] .title { color: var(--accent); }
    [data-block="closing"] .content { padding-top: 62px; padding-bottom: 62px; }
    @media (max-width: 760px) {
      .deck-section { min-height: 62vh; }
      .content { padding: 20px; }
      .layout-a .content, .layout-b .content { width: calc(100% - 24px); margin: 12px; }
    }
  </style>
</head>
<body>
${sectionMarkup}
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script>
  gsap.registerPlugin(ScrollTrigger);
  gsap.utils.toArray('[data-gsap="section"]').forEach((section) => {
    const title = section.querySelector('.title');
    const body = section.querySelector('.body');
    const image = section.querySelector('[data-gsap="image"]');
    gsap.from(title, {
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 75%' },
    });
    gsap.from(body, {
      y: 18,
      opacity: 0,
      duration: .7,
      delay: .1,
      scrollTrigger: { trigger: section, start: 'top 72%' },
    });
    if (image) {
      gsap.to(image, {
        yPercent: 8,
        ease: 'none',
        scrollTrigger: { trigger: section, scrub: true },
      });
    }
  });
</script>
</body>
</html>`;
  };

  const openHtmlPreview = () => {
    setHtmlPreviewOpen(true);
  };

  useEffect(() => {
    if (!htmlPreviewOpen || !htmlFrameRef.current) return;
    htmlFrameRef.current.srcdoc = generateHtmlDeck();
  }, [htmlPreviewOpen, blocks, palette, layout, theme, supplemental, heroImage]);

  const downloadHtml = () => {
    const blob = new Blob([generateHtmlDeck()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pitch-deck-gsap.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdfSinglePage = async () => {
    if (!deckRef.current) return;
    const canvas = await html2canvas(deckRef.current, { scale: 2, backgroundColor: palette.bg });
    const img = canvas.toDataURL("image/jpeg", 0.94);
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(img, "JPEG", 0, 0, canvas.width, canvas.height);
    pdf.save("pitch-deck-single-page.pdf");
  };

  return (
    <div className="min-h-screen" style={{ background: palette.bg, color: palette.text }}>
      <div className="mx-auto grid max-w-[1600px] gap-4 p-4 md:grid-cols-[360px_1fr]">
        <aside className="space-y-4 border border-white/10 p-4" style={{ background: palette.surface }}>
          <h1 className="text-xl font-semibold tracking-wide">Pitch Deck Creator</h1>

          <label className="flex cursor-pointer items-center justify-center gap-2 border border-white/20 p-3 text-sm">
            <Upload className="h-4 w-4" />
            Upload Main Reference Image
            <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
          </label>

          <div className="space-y-2 border border-white/10 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/70">
              <Palette className="h-3.5 w-3.5" /> Palette
            </div>
            <div className="flex gap-2">
              {[palette.primary, palette.secondary, palette.accent].map((c) => (
                <ColorChip key={c} color={c} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Theme Weight</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="border p-2 text-sm"
                style={{ borderColor: theme === "cinematic" ? palette.accent : "rgba(255,255,255,.2)" }}
                onClick={() => setTheme("cinematic")}
              >
                Cinematic Bold
              </button>
              <button
                className="border p-2 text-sm"
                style={{ borderColor: theme === "minimal" ? palette.accent : "rgba(255,255,255,.2)" }}
                onClick={() => setTheme("minimal")}
              >
                Minimal
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Layout Option</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="border p-2 text-sm"
                style={{ borderColor: layout === "A" ? palette.primary : "rgba(255,255,255,.2)" }}
                onClick={() => setLayout("A")}
              >
                Option A (Mosaic)
              </button>
              <button
                className="border p-2 text-sm"
                style={{ borderColor: layout === "B" ? palette.primary : "rgba(255,255,255,.2)" }}
                onClick={() => setLayout("B")}
              >
                Option B (Editorial)
              </button>
            </div>
            <p className="text-xs text-white/60">Layout A and B now use different composition and font families.</p>
          </div>

          <div className="space-y-2 border border-white/10 p-3">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Selected Block Content</p>
            <select
              className="w-full border border-white/20 bg-black/30 p-2 text-sm"
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value as BlockType)}
            >
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.label}
                </option>
              ))}
            </select>
            {selected && (
              <>
                <input
                  className="w-full border border-white/20 bg-black/30 p-2 text-sm"
                  value={selected.title}
                  onChange={(e) => updateSelectedBlock({ title: e.target.value })}
                />
                <textarea
                  className="h-20 w-full border border-white/20 bg-black/30 p-2 text-sm"
                  value={selected.body}
                  onChange={(e) => updateSelectedBlock({ body: e.target.value })}
                />
              </>
            )}
          </div>

          <div className="space-y-2 border border-white/10 p-3">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Supplemental Images</p>
            <div className="grid grid-cols-2 gap-2">
              {(["character", "moodboard", "visual", "reference"] as SupplementalType[]).map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-2 border border-white/20 p-2 text-xs uppercase">
                  <Plus className="h-3 w-3" /> {type}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onSupplementalUpload(type, e.target.files)} />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {supplemental.map((img) => {
                const assigned = selected?.imageIds.includes(img.id);
                return (
                  <button
                    key={img.id}
                    className="relative aspect-square overflow-hidden border"
                    style={{ borderColor: assigned ? palette.accent : "rgba(255,255,255,.15)" }}
                    onClick={() => assignImage(img.id)}
                    title={img.name}
                  >
                    <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                    <span className="absolute bottom-0 left-0 bg-black/70 px-1 text-[10px] uppercase text-white/80">{img.type}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-2 border border-white/20 p-2 text-sm" onClick={() => setEditing((v) => !v)}>
              <Move className="h-4 w-4" /> {editing ? "Stop Move" : "Reorder"}
            </button>
            <button className="flex items-center justify-center gap-2 border border-white/20 p-2 text-sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" /> Preview
            </button>
            <button className="flex items-center justify-center gap-2 border border-white/20 p-2 text-sm" onClick={openHtmlPreview}>
              <FileCode className="h-4 w-4" /> HTML
            </button>
            <button className="flex items-center justify-center gap-2 border border-white/20 p-2 text-sm" onClick={exportPdfSinglePage}>
              <Download className="h-4 w-4" /> Single PDF
            </button>
          </div>
        </aside>

        <main className="border border-white/10" ref={deckRef} style={{ background: palette.bg }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sectionIds} strategy={rectSortingStrategy}>
              {blocks.map((block, index) => (
                <SortableSection
                  key={block.id}
                  block={block}
                  index={index}
                  layout={layout}
                  theme={theme}
                  palette={palette}
                  heroImage={heroImage}
                  supplemental={supplemental}
                  editing={editing}
                  onSelect={setSelectedBlock}
                  selected={selectedBlock === block.id}
                />
              ))}
            </SortableContext>
          </DndContext>
        </main>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/90 p-5">
          <div className="mx-auto mb-4 flex max-w-6xl justify-end">
            <button className="border border-white/20 px-4 py-2 text-sm" onClick={() => setPreviewOpen(false)}>
              Close Preview
            </button>
          </div>
          <div className="mx-auto max-w-6xl border border-white/20">
            {blocks.map((block, index) => (
              <SortableSection
                key={`preview-${block.id}`}
                block={block}
                index={index}
                layout={layout}
                theme={theme}
                palette={palette}
                heroImage={heroImage}
                supplemental={supplemental}
                editing={false}
                onSelect={() => undefined}
                selected={false}
              />
            ))}
          </div>
        </div>
      )}

      {htmlPreviewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between border-b border-white/20 p-3">
            <div className="flex items-center gap-3 text-sm text-white">
              <Layout className="h-4 w-4" /> HTML + GSAP Preview
            </div>
            <div className="flex gap-2">
              <button className="border border-white/20 px-3 py-1 text-sm" onClick={downloadHtml}>
                Download .html
              </button>
              <button className="border border-white/20 px-3 py-1 text-sm" onClick={() => setHtmlPreviewOpen(false)}>
                Close
              </button>
            </div>
          </div>
          <iframe ref={htmlFrameRef} className="h-full w-full" title="HTML Preview" sandbox="allow-scripts" />
        </div>
      )}
    </div>
  );
}
