import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { PinIcon, PinChip, PinSwatches } from "@/components/ui/pindeck";
import type { Tweaks } from "../TweaksPanel";
import { downloadImage } from "@/lib/imageDownload";

interface ImageDetailDrawerProps {
  image: any;
  onClose: () => void;
  tweaks: Tweaks;
  onOpenImage?: (img: any) => void;
}

const VARIATION_MODES: { id: string; label: string }[] = [
  { id: "shot-variation", label: "Shot Variation" },
  { id: "b-roll", label: "B-Roll" },
  { id: "action-shot", label: "Action Shot" },
  { id: "style-variation", label: "Style Variation" },
  { id: "subtle-variation", label: "Subtle Variation" },
  { id: "coverage", label: "Coverage" },
];

const SHOT_CHIP_PRESETS: { label: string; detail: string }[] = [
  { label: "None", detail: "" },
  { label: "Variation", detail: "variation" },
  { label: "Close-up", detail: "close-up" },
  { label: "Medium", detail: "medium shot" },
  { label: "Wide", detail: "wide shot" },
  { label: "Extreme wide", detail: "extreme wide shot" },
  { label: "Dutch", detail: "dutch angle" },
  { label: "OTS", detail: "over-the-shoulder" },
  { label: "Low angle", detail: "low angle shot" },
  { label: "Bird's eye", detail: "bird's eye view" },
];

const ASPECT_OPTIONS: { label: string; value: string }[] = [
  { label: "2.39", value: "16:9" },
  { label: "16:9", value: "16:9" },
  { label: "1:1", value: "1:1" },
  { label: "9:16", value: "9:16" },
  { label: "4:3", value: "4:3" },
];

const COUNT_OPTIONS = [1, 4, 8];

type EditDraft = {
  title: string;
  description: string;
  tags: string[];
  sref: string;
  category: string;
  group: string;
  genre: string;
  shot: string;
  style: string;
  projectName: string;
  moodboardName: string;
  source: string;
  uniqueId: string;
};

const editDraftFromImage = (image: any): EditDraft => ({
  title: image.title || "",
  description: image.description || "",
  tags: Array.isArray(image.tags) ? image.tags : [],
  sref: image.sref || "",
  category: image.category || "",
  group: image.group || "",
  genre: image.genre || "",
  shot: image.shot || "",
  style: image.style || "",
  projectName: image.projectName || "",
  moodboardName: image.moodboardName || "",
  source: image.source || "",
  uniqueId: image.uniqueId || "",
});

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.14em",
  color: "var(--pd-ink-faint)",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 3,
  fontWeight: 500,
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 24,
  padding: "0 0 3px",
  background: "transparent",
  color: "var(--pd-ink)",
  border: "0",
  borderBottom: "1px solid var(--pd-line)",
  borderRadius: 0,
  fontSize: 12,
  outline: "none",
};

const cleanOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export function ImageDetailDrawer({ image, onClose, tweaks, onOpenImage }: ImageDetailDrawerProps) {
  const [tab, setTab] = useState("edit");
  const generateVariations = useMutation(api.vision.generateVariations);
  const updateImageMetadata = useMutation(api.images.updateImageMetadata);
  const enqueueMetadataRefresh = useMutation(api.images.enqueueMetadataRefresh);
  const lineage = useQuery((api as any).images.getLineage, { imageId: image._id as Id<"images"> });
  const [genBusy, setGenBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [metadataBusy, setMetadataBusy] = useState(false);
  const [metadataStatus, setMetadataStatus] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [editDraft, setEditDraft] = useState<EditDraft>(() => editDraftFromImage(image));

  const [genMode, setGenMode] = useState(image.modificationMode || "shot-variation");
  const [genDetail, setGenDetail] = useState(image.variationDetail || "");
  const [genCount, setGenCount] = useState(
    image.variationCount && image.variationCount > 0 ? image.variationCount : 4,
  );
  /** Aspect label picked in UI (“2.39” maps to Falcon `16:9`). */
  const [aspectLabel, setAspectLabel] = useState("16:9");

  const falAspect = ASPECT_OPTIONS.find((o) => o.label === aspectLabel)?.value ?? "16:9";

  useEffect(() => {
    setGenMode(image.modificationMode || "shot-variation");
    setGenDetail(image.variationDetail || "");
    setGenCount(image.variationCount && image.variationCount > 0 ? image.variationCount : 4);
    setAspectLabel("16:9");
    setEditDraft(editDraftFromImage(image));
    setTagInput("");
  }, [image._id, image.modificationMode, image.variationDetail, image.variationCount]);

  const fmtSref = (s: string | undefined) => {
    if (!s) return "—";
    const match = s.match(/\d+/);
    return match ? `--sref ${match[0]}` : "—";
  };

  const dash = (v: string | undefined) => (v?.trim() ? v.trim() : "—");

  const updateEditDraft = (updates: Partial<EditDraft>) => {
    setEditDraft((current) => ({ ...current, ...updates }));
  };

  const addEditTag = (rawTag: string) => {
    const nextTags = rawTag
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);
    if (nextTags.length === 0) return;
    updateEditDraft({ tags: [...new Set([...editDraft.tags, ...nextTags])] });
    setTagInput("");
  };

  const removeEditTag = (tag: string) => {
    updateEditDraft({ tags: editDraft.tags.filter((item) => item !== tag) });
  };

  const tabs = [
    { id: "edit", label: "Edit", icon: "edit" },
    { id: "variations", label: "Variations", icon: "sparkle" },
    { id: "lineage", label: "Lineage", icon: "tree" },
  ];

  const modeTitle = VARIATION_MODES.find((m) => m.id === genMode)?.label ?? "Variation";

  const handleGenerate = async () => {
    setGenBusy(true);
    try {
      await generateVariations({
        imageId: image._id as Id<"images">,
        variationCount: genCount,
        modificationMode: genMode,
        variationDetail: genDetail.trim() || undefined,
        aspectRatio: falAspect,
      });
      toast.success(`Generating ${genCount} ${genCount === 1 ? "variation" : "variations"}…`);
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "Could not start generation (sign in, own the image, deploy Convex).",
      );
    } finally {
      setGenBusy(false);
    }
  };

  const handleSaveMetadata = async () => {
    setSaveBusy(true);
    try {
      await updateImageMetadata({
        imageId: image._id as Id<"images">,
        title: editDraft.title.trim() || "Untitled",
        description: cleanOptional(editDraft.description),
        tags: editDraft.tags,
        category: editDraft.category.trim() || "Uncategorized",
        sref: cleanOptional(editDraft.sref),
        group: cleanOptional(editDraft.group),
        genre: cleanOptional(editDraft.genre),
        shot: cleanOptional(editDraft.shot),
        style: cleanOptional(editDraft.style),
        projectName: cleanOptional(editDraft.projectName),
        moodboardName: cleanOptional(editDraft.moodboardName),
        source: cleanOptional(editDraft.source),
        uniqueId: cleanOptional(editDraft.uniqueId),
      });
      toast.success("Image details saved.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not save image details.");
    } finally {
      setSaveBusy(false);
    }
  };

  const chipBase: React.CSSProperties = {
    padding: "4px 8px",
    borderRadius: 4,
    fontSize: 10.5,
    border: "1px solid transparent",
    background: "rgba(255,255,255,0.025)",
    color: "var(--pd-ink-dim)",
    cursor: "pointer",
  };

  const handleGenerateMetadata = async () => {
    setMetadataBusy(true);
    setMetadataStatus("Generating metadata and sampled palette...");
    try {
      const r = await enqueueMetadataRefresh({
        imageIds: [image._id as Id<"images">],
        onlyMissing: false,
        forceAll: true,
        staggerMs: 500,
      });
      setMetadataStatus(
        r.metadataScheduled === 0 && r.paletteScheduled === 0
          ? "No eligible image found for this account. Sign in as the image owner to generate metadata and palettes."
          : `Queued ${r.metadataScheduled} metadata and ${r.paletteScheduled} palette job${r.metadataScheduled + r.paletteScheduled === 1 ? "" : "s"}. Reload after processing to see updated fields.`,
      );
    } catch (e) {
      console.error(e);
      setMetadataStatus("Could not queue metadata generation. Check sign-in and Convex deploy status.");
      toast.error(e instanceof Error ? e.message : "Could not queue metadata generation.");
    } finally {
      setMetadataBusy(false);
    }
  };
  const chipSelected: React.CSSProperties = {
    ...chipBase,
    border: "1px solid transparent",
    background: "var(--pd-accent-soft)",
    color: "var(--pd-accent-ink)",
  };

  const lineageCard = (item: any, label: string) => (
    <button
      key={item._id}
      type="button"
      className="pd-fade-in"
      style={{
        display: "grid",
        gridTemplateColumns: "72px 1fr",
        gap: 10,
        width: "100%",
        textAlign: "left",
        padding: 8,
        borderRadius: 5,
        border: "1px solid var(--pd-line)",
        background: "rgba(255,255,255,0.022)",
        color: "var(--pd-ink-dim)",
      }}
      onClick={() => {
        onOpenImage?.(item);
      }}
    >
      <img
        src={item.derivativeUrls?.small || item.previewUrl || item.imageUrl}
        alt={item.title}
        style={{ width: 72, height: 44, borderRadius: 3, objectFit: "cover", background: "#000" }}
      />
      <span style={{ minWidth: 0 }}>
        <span className="pd-mono" style={{ display: "block", fontSize: 9, letterSpacing: "0.08em", color: "var(--pd-ink-faint)", textTransform: "uppercase", marginBottom: 4 }}>
          {label}
        </span>
        <span style={{ display: "block", fontSize: 12, color: "var(--pd-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.title || "Untitled"}
        </span>
        <span className="pd-mono" style={{ display: "block", marginTop: 5, fontSize: 9, color: "var(--pd-ink-faint)" }}>
          {item.colors?.length ? `${item.colors.length} sampled colors` : "palette pending"}
        </span>
      </span>
    </button>
  );

  return (
    <aside className="pd-slide-in pd-scroll" style={{
      width: 440, flexShrink: 0, minHeight: 0, alignSelf: "stretch",
      overflow: "auto",
      background: "rgba(11, 11, 14, 0.82)", borderLeft: "1px solid var(--pd-line)",
      backdropFilter: "blur(10px) saturate(1.12)",
      display: "flex", flexDirection: "column", position: "relative",
    }}>
      <div style={{
        padding: "12px 14px 10px", borderBottom: "1px solid var(--pd-line)",
        display: "flex", alignItems: "center", gap: 8, position: "sticky", top: 0,
        background: "rgba(11, 11, 14, 0.9)", backdropFilter: "blur(10px) saturate(1.12)", zIndex: 2,
      }}>
        <button onClick={onClose} style={{
          width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 3, color: "var(--pd-ink-dim)", border: "1px solid var(--pd-line)",
        }}>
          <PinIcon name="close" size={12} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: "var(--pd-ink)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{image.title}</div>
          <div className="pd-mono" style={{ fontSize: 10, color: "var(--pd-ink-faint)", letterSpacing: "0.04em" }}>
            {image._id} · {image.sref || "—"}
          </div>
          <div
            className="pd-mono"
            style={{
              fontSize: 9,
              color: "var(--pd-ink-mute)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            {dash(image.shot)} · {dash(image.style)} · {dash(image.genre)}
          </div>
        </div>
        <button
          type="button"
          className="pd-mono"
          onClick={() => {
            if (downloadImage(image)) toast.success("Started high-res download.");
            else toast.error("No downloadable image URL found.");
          }}
          style={{
            alignSelf: "flex-start",
            padding: "5px 7px",
            borderRadius: 4,
            border: "1px solid var(--pd-line)",
            background: "rgba(255,255,255,0.025)",
            color: "var(--pd-ink-dim)",
            fontSize: 10,
            whiteSpace: "nowrap",
          }}
        >
          Download
        </button>
      </div>

      <div style={{ padding: "12px 14px 0" }}>
        <div
          className="pd-letterbox"
          style={
            {
              borderRadius: 3,
              overflow: "hidden",
              background: "#000",
              aspectRatio: "16/9",
              position: "relative",
              "--pd-lb": tweaks.letterbox ? "14px" : "0px",
            } as React.CSSProperties
          }
        >
          <img src={image.imageUrl} alt={image.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            justifyContent: "flex-end",
            maxWidth: "92%",
          }}>
            <span className="pd-mono" style={{
              padding: "2px 5px",
              fontSize: 9,
              background: "rgba(0,0,0,0.65)",
              color: "var(--pd-ink-dim)",
              borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.12)",
            }}>16:9</span>
            {image.style ? (
              <span className="pd-mono" style={{
                padding: "2px 5px",
                fontSize: 9,
                background: "rgba(0,0,0,0.65)",
                color: "var(--pd-ink-dim)",
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.12)",
              }}>{image.style}</span>
            ) : null}
          </div>
          <div style={{ position: "absolute", bottom: 8, left: 8, right: "28%", display: "flex", flexWrap: "wrap", gap: 4 }}>
            <PinChip mono variant="outline">{image.category}</PinChip>
            <PinChip mono variant="outline">{dash(image.group)}</PinChip>
            {image.genre ? <PinChip mono variant="outline">{image.genre}</PinChip> : null}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="pd-mono" style={{ ...labelStyle, marginBottom: 6 }}>Palette</div>
          {image.colors?.length ? (
            <div style={{ display: "flex", gap: 0, borderRadius: 3, overflow: "hidden", height: 18 }}>
              {image.colors.map((c: string, i: number) => (
                <div key={i} style={{ flex: 1, background: c, position: "relative" }} title={c}>
                  <span className="pd-mono" style={{
                    position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                    fontSize: 9, color: "var(--pd-ink-faint)", marginTop: 3, whiteSpace: "nowrap",
                  }}>{c.toUpperCase().slice(1, 4)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 20 }}>
              <PinSwatches pad={5} colors={[]} size={12} gap={4} />
              <span className="pd-mono" style={{ fontSize: 10, color: "var(--pd-ink-faint)" }}>
                No sampled colors yet
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 14, padding: "16px 0 10px", fontSize: 11, color: "var(--pd-ink-mute)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><PinIcon name="eye" size={11} /> {image.views}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><PinIcon name="heart" size={11} /> {image.likes}</span>
          <div style={{ flex: 1 }} />
          <span className="pd-mono" style={{ color: "var(--pd-ink-faint)" }}>{image.projectName || "—"}</span>
        </div>
      </div>

      <div style={{ padding: "0 14px", borderBottom: "1px solid var(--pd-line)", display: "flex", gap: 0 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "8px 10px",
            borderBottom: tab === t.id ? "1.5px solid var(--pd-accent)" : "1.5px solid transparent",
            color: tab === t.id ? "var(--pd-ink)" : "var(--pd-ink-mute)",
            fontSize: 12, fontWeight: 500, marginBottom: -1,
          }}>
            <PinIcon name={t.icon} size={11} /> {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "14px", paddingBottom: 20 }}>
        {tab === "edit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <div>
              <label className="pd-mono" style={labelStyle}>Title</label>
              <input
                value={editDraft.title}
                onChange={(e) => updateEditDraft({ title: e.target.value })}
                style={fieldStyle}
              />
            </div>
            <div>
              <label className="pd-mono" style={labelStyle}>Description</label>
              <textarea
                value={editDraft.description}
                onChange={(e) => updateEditDraft({ description: e.target.value })}
                rows={2}
                style={{ ...fieldStyle, minHeight: 52, paddingTop: 5, resize: "vertical" }}
              />
            </div>
            <div>
              <label className="pd-mono" style={labelStyle}>Tags ({editDraft.tags.length})</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, minHeight: 24, marginBottom: 4 }}>
                {editDraft.tags.map((t: string, i: number) => (
                  <PinChip
                    key={t}
                    color={image.colors?.[i % (image.colors?.length || 1)]}
                    removable
                    onRemove={() => removeEditTag(t)}
                  >
                    {t}
                  </PinChip>
                ))}
              </div>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEditTag(tagInput);
                  }
                }}
                onBlur={() => addEditTag(tagInput)}
                placeholder="Add tags..."
                style={fieldStyle}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: 18,
                rowGap: 8,
                padding: "8px 0 2px",
                borderTop: "1px solid var(--pd-line)",
                borderBottom: "1px solid var(--pd-line)",
              }}
            >
              {[
                ["Category", "category"],
                ["Type", "group"],
                ["Genre", "genre"],
                ["Shot", "shot"],
                ["Style", "style"],
                ["SREF", "sref"],
                ["Project", "projectName"],
                ["Moodboard", "moodboardName"],
                ["Source", "source"],
                ["Unique ID", "uniqueId"],
              ].map(([label, key]) => (
                <div key={key} style={{ minWidth: 0 }}>
                  <label className="pd-mono" style={labelStyle}>{label}</label>
                  <input
                    value={editDraft[key as keyof EditDraft] as string}
                    onChange={(e) => updateEditDraft({ [key]: e.target.value } as Partial<EditDraft>)}
                    style={fieldStyle}
                  />
                </div>
              ))}
            </div>

            <div
              className="pd-mono"
              style={{
                fontSize: 10,
                color: "var(--pd-ink-faint)",
                border: "0",
                borderBottom: "1px solid var(--pd-line)",
                padding: "2px 0 7px",
                background: "transparent",
              }}
            >
              Display SREF: {fmtSref(editDraft.sref)}
            </div>

            <div
              style={{
                border: "1px solid var(--pd-line)",
                background: "rgba(255,255,255,0.025)",
                borderRadius: 5,
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 7,
              }}
            >
              <div>
                <div className="pd-mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--pd-ink-faint)", textTransform: "uppercase", marginBottom: 4 }}>
                  AI metadata
                </div>
                <div style={{ fontSize: 11, color: "var(--pd-ink-mute)", lineHeight: 1.35 }}>
                  Generate tags, type, genre, shot, style, SREF hints, and sampled colors.
                </div>
              </div>
              {metadataStatus ? (
                <div className="pd-mono" style={{ fontSize: 10, color: "var(--pd-ink-faint)", lineHeight: 1.45 }}>
                  {metadataStatus}
                </div>
              ) : null}
              <button
                type="button"
                disabled={metadataBusy}
                onClick={() => void handleGenerateMetadata()}
                style={{
                  ...chipSelected,
                  alignSelf: "flex-start",
                  cursor: metadataBusy ? "wait" : "pointer",
                  opacity: metadataBusy ? 0.75 : 1,
                }}
              >
                {metadataBusy ? "Generating..." : "Generate Metadata & Palette"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setEditDraft(editDraftFromImage(image))}
                style={chipBase}
              >
                Reset
              </button>
              <button
                type="button"
                disabled={saveBusy}
                onClick={() => void handleSaveMetadata()}
                style={{
                  ...chipSelected,
                  cursor: saveBusy ? "wait" : "pointer",
                  opacity: saveBusy ? 0.75 : 1,
                }}
              >
                {saveBusy ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}
        {tab === "variations" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                background: "rgba(255,255,255,0.018)",
                border: "1px solid transparent",
                borderRadius: 6,
                padding: "10px 10px 12px",
              }}
            >
              <span className="pd-mono" style={{
                fontSize: 10, letterSpacing: "0.06em", color: "var(--pd-ink-faint)", display: "block", marginBottom: 8,
              }}>Mode</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {VARIATION_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setGenMode(m.id)}
                    style={{
                      padding: "8px 6px",
                      borderRadius: 5,
                      fontSize: 10.5,
                      fontWeight: 500,
                      lineHeight: 1.25,
                      textAlign: "center",
                      border: "1px solid transparent",
                      background: genMode === m.id ? "var(--pd-accent-soft)" : "rgba(255,255,255,0.025)",
                      color: genMode === m.id ? "var(--pd-accent-ink)" : "var(--pd-ink-dim)",
                      cursor: "pointer",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="pd-mono" style={{
                fontSize: 10, letterSpacing: "0.06em", color: "var(--pd-ink-faint)", display: "block", marginBottom: 8,
              }}>Shot type</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SHOT_CHIP_PRESETS.map((s) => {
                  const sel = genDetail.trim().toLowerCase() === s.detail.toLowerCase();
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setGenDetail(s.detail)}
                      style={sel ? chipSelected : chipBase}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="pd-mono" style={{
                fontSize: 10, letterSpacing: "0.06em", color: "var(--pd-ink-faint)", display: "block", marginBottom: 8,
              }}>Aspect</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ASPECT_OPTIONS.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => setAspectLabel(a.label)}
                    style={
                      aspectLabel === a.label
                        ? chipSelected
                        : chipBase
                    }
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="pd-mono" style={{
                fontSize: 10, letterSpacing: "0.06em", color: "var(--pd-ink-faint)", display: "block", marginBottom: 8,
              }}>Count</span>
              <div style={{ display: "flex", gap: 6 }}>
                {COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setGenCount(n)}
                    style={genCount === n ? chipSelected : chipBase}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="pd-mono" style={{
                fontSize: 10, letterSpacing: "0.06em", color: "var(--pd-ink-faint)", display: "block", marginBottom: 6,
              }}>Custom detail (optional)</span>
              <input
                value={genDetail}
                onChange={(e) => setGenDetail(e.target.value)}
                placeholder="Refines prompts for this generation run"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 4,
                  fontSize: 11,
                  border: "1px solid var(--pd-line-strong)",
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--pd-ink)",
                  outline: "none",
                }}
              />
            </div>

            <div style={{
              background: "var(--pd-bg-2)",
              border: "1px solid var(--pd-line)",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 10,
              color: "var(--pd-ink-faint)",
              lineHeight: 1.45,
            }}>
              Uses table metadata (<span className="pd-mono">Type / Genre / Shot / Style / tags</span>) plus the controls
              above. Backfill gaps from the Table view first when fields read as — .
            </div>

            <button
              type="button"
              disabled={genBusy || genCount < 1}
              onClick={() => void handleGenerate()}
              style={{
                marginTop: 4,
                width: "100%",
                padding: "12px 14px",
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 600,
                cursor: genBusy ? "wait" : "pointer",
                background: genBusy ? "var(--pd-line-strong)" : "var(--pd-accent-soft)",
                border: "1px solid transparent",
                color: "var(--pd-accent-ink)",
                opacity: genBusy ? 0.85 : 1,
              }}
            >
              {genBusy ? "Starting…" : `Generate ${modeTitle}`}
            </button>
          </div>
        )}
        {tab === "lineage" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                border: "1px solid var(--pd-line)",
                background: "rgba(255,255,255,0.018)",
                borderRadius: 6,
                padding: "9px 10px",
                fontSize: 11,
                color: "var(--pd-ink-mute)",
                lineHeight: 1.45,
              }}
            >
              Generated children inherit the parent metadata as a starting point, then queue their own palette and metadata analysis so visual changes can diverge cleanly.
            </div>

            {lineage === undefined ? (
              <div className="pd-mono" style={{ color: "var(--pd-ink-faint)", fontSize: 10, padding: "10px 0" }}>
                Loading lineage...
              </div>
            ) : (
              <>
                <div>
                  <div className="pd-mono" style={{ ...labelStyle, marginBottom: 7 }}>Parent</div>
                  {lineage.parent ? (
                    lineageCard(lineage.parent, "Parent image")
                  ) : (
                    <div className="pd-mono" style={{ color: "var(--pd-ink-faint)", fontSize: 10 }}>
                      This image is an original/root image.
                    </div>
                  )}
                </div>

                <div>
                  <div className="pd-mono" style={{ ...labelStyle, marginBottom: 7 }}>Children ({lineage.children.length})</div>
                  {lineage.children.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {lineage.children.map((child: any) => lineageCard(child, "Generated child"))}
                    </div>
                  ) : (
                    <div className="pd-mono" style={{ color: "var(--pd-ink-faint)", fontSize: 10 }}>
                      No generated children yet.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
