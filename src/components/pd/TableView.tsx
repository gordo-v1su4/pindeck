import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PinChip, PinSwatches } from "@/components/ui/pindeck";
import type { LibraryFilters } from "@/lib/libraryFilters";
import { applyLibraryFilters, normalizeLibraryGroup } from "@/lib/libraryFilters";
import { toast } from "sonner";

/** Deduped numeric tokens for `--sref`-style chips (supports multiple numbers in one cell). */
function parseSrefIds(raw: string | undefined): string[] {
  const s = raw?.trim();
  if (!s) return [];
  const matches = s.match(/\d+/g);
  if (!matches?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    if (seen.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out;
}

const oneLineCell: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

interface TableViewProps {
  search: string;
  onOpenImage: (img: any) => void;
  libraryFilter: LibraryFilters;
}

export function TableView({ search, onOpenImage, libraryFilter }: TableViewProps) {
  const images = useQuery(api.images.list, { limit: 1000 });
  const reExtractPalettes = useMutation(api.colorExtractionAdmin.reExtractAll);
  const enqueueMetadataBackfill = useMutation(api.images.enqueueCinematicMetadataBackfill);
  const [paletteBusy, setPaletteBusy] = useState(false);
  const [metaBusy, setMetaBusy] = useState(false);
  const [sort, setSort] = useState<{ by: string; dir: "asc" | "desc" }>({ by: "title", dir: "asc" });

  const handleRefreshPalettes = useCallback(async () => {
    if (
      !confirm(
        "Re-sample color swatches for all images (server jobs)? Reload after a minute to see updates."
      )
    ) {
      return;
    }
    setPaletteBusy(true);
    try {
      const r = await reExtractPalettes({ onlyMissing: false });
      toast.success(`Scheduled palette extraction for ${r.scheduled} image(s).`);
    } catch (e) {
      console.error(e);
      toast.error("Could not schedule palette refresh (sign in & deploy Convex).");
    } finally {
      setPaletteBusy(false);
    }
  }, [reExtractPalettes]);

  const handleBackfillMetadata = useCallback(async () => {
    if (
      !confirm(
        "Schedule AI metadata backfill for your uploads (TYPE, Genre, Shot, Style)? " +
          "Runs on the server with a few seconds between images. Reload later to see new columns.",
      )
    ) {
      return;
    }
    setMetaBusy(true);
    try {
      const r = await enqueueMetadataBackfill({ onlyMissing: true });
      toast.success(`Scheduled metadata analysis for ${r.scheduled} image(s). (${r.skipped} skipped — no URL.)`);
    } catch (e) {
      console.error(e);
      toast.error("Could not schedule backfill (sign in / deploy Convex).");
    } finally {
      setMetaBusy(false);
    }
  }, [enqueueMetadataBackfill]);

  const filtered = useMemo(() => {
    if (!images) return [];
    let data = applyLibraryFilters([...images], libraryFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((im) =>
        im.title.toLowerCase().includes(q) ||
        im.tags?.some((t: string) => t.toLowerCase().includes(q)) ||
        im.sref?.toLowerCase().includes(q)
      );
    }
    data.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const av = a[sort.by as keyof typeof a] ?? "";
      const bv = b[sort.by as keyof typeof b] ?? "";
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return data;
  }, [images, libraryFilter, search, sort]);

  const headerCell = (label: string, key: string, w?: number) => (
    <th
      style={{
        padding: "7px 8px",
        textAlign: "left",
        verticalAlign: "bottom",
        fontSize: 10,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: sort.by === key ? "var(--pd-ink)" : "var(--pd-ink-faint)",
        fontWeight: 600,
        fontFamily: "var(--pd-font-mono)",
        borderBottom: "1px solid var(--pd-line-strong)",
        background: "var(--pd-bg-1)",
        position: "sticky",
        top: 0,
        cursor: "pointer",
        width: w,
      }}
      onClick={() => setSort({ by: key, dir: sort.by === key && sort.dir === "asc" ? "desc" : "asc" })}
    >
      {label}
    </th>
  );

  if (images === undefined) {
    return <div className="pd-fade-in" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--pd-ink-faint)" }}>Loading…</div>;
  }

  return (
    <div className="pd-scroll pd-fade-in" style={{ flex: 1, overflow: "auto", padding: 0, background: "var(--pd-bg)", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderBottom: "1px solid var(--pd-line)",
          background: "var(--pd-bg-1)",
        }}
      >
        <button
          type="button"
          disabled={metaBusy}
          onClick={(e) => {
            e.stopPropagation();
            void handleBackfillMetadata();
          }}
          className="pd-mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "6px 10px",
            borderRadius: 4,
            border: "1px solid var(--pd-line-strong)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--pd-ink-dim)",
            cursor: metaBusy ? "wait" : "pointer",
            opacity: metaBusy ? 0.6 : 1,
          }}
        >
          {metaBusy ? "Scheduling…" : "Backfill metadata"}
        </button>
        <button
          type="button"
          disabled={paletteBusy}
          onClick={(e) => {
            e.stopPropagation();
            void handleRefreshPalettes();
          }}
          className="pd-mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "6px 10px",
            borderRadius: 4,
            border: "1px solid var(--pd-line-strong)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--pd-ink-dim)",
            cursor: paletteBusy ? "wait" : "pointer",
            opacity: paletteBusy ? 0.6 : 1,
          }}
        >
          {paletteBusy ? "Scheduling…" : "Re-sample palettes"}
        </button>
      </div>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 11.5, tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th
              aria-label="Sort by id"
              style={{
                padding: "7px 6px",
                textAlign: "left",
                verticalAlign: "bottom",
                width: 52,
                minWidth: 52,
                maxWidth: 52,
                fontSize: 10,
                borderBottom: "1px solid var(--pd-line-strong)",
                background: "var(--pd-bg-1)",
                position: "sticky",
                top: 0,
                cursor: "pointer",
              }}
              onClick={() =>
                setSort({
                  by: "_id",
                  dir: sort.by === "_id" && sort.dir === "asc" ? "desc" : "asc",
                })
              }
            >
              {"\u00a0"}
            </th>
            {headerCell("Title", "title", 520)}
            {headerCell("Type", "group", 150)}
            {headerCell("Genre", "genre", 90)}
            {headerCell("Shot", "shot", 150)}
            {headerCell("Style", "style", 96)}
            {headerCell("Tags", "tags", 210)}
            <th
              style={{
                padding: "7px 8px",
                textAlign: "left",
                verticalAlign: "bottom",
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--pd-ink-faint)",
                fontWeight: 600,
                fontFamily: "var(--pd-font-mono)",
                borderBottom: "1px solid var(--pd-line-strong)",
                background: "var(--pd-bg-1)",
                position: "sticky",
                top: 0,
                width: 104,
              }}
            >
              Palette
            </th>
            {headerCell("Sref", "sref", 260)}
            {headerCell("♥", "likes", 38)}
            {headerCell("👁", "views", 46)}
          </tr>
        </thead>
        <tbody>
          {filtered.map((im, i) => {
            const srefIds = parseSrefIds(im.sref);
            const visibleSrefIds = srefIds.slice(0, 3);
            const hiddenSrefCount = Math.max(0, srefIds.length - visibleSrefIds.length);
            return (
            <tr
              key={im._id}
              onClick={() => onOpenImage(im)}
              style={{
                cursor: "pointer",
                background: i % 2 ? "transparent" : "rgba(255,255,255,0.012)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(58,123,255,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 ? "transparent" : "rgba(255,255,255,0.012)"; }}
            >
              <td style={{ padding: "4px 8px", borderBottom: "1px solid var(--pd-line)" }}>
                <div style={{ width: 36, height: 24, background: "#000", borderRadius: 2, overflow: "hidden" }}>
                  <img src={im.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              </td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink)", fontWeight: 500, textAlign: "left", ...oneLineCell }}>{im.title}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink-dim)", ...oneLineCell }}>{normalizeLibraryGroup(im.group) || "—"}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink-dim)", ...oneLineCell }}>{im.genre || "—"}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink-dim)", ...oneLineCell }}>{im.shot || "—"}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink-dim)", ...oneLineCell }}>{im.style || "—"}</td>
              <td
                style={{
                  padding: "4px 8px",
                  borderBottom: "1px solid var(--pd-line)",
                  maxWidth: 210,
                  verticalAlign: "top",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    gap: 3,
                    flexWrap: "nowrap",
                    maxWidth: "100%",
                    overflow: "hidden",
                    alignItems: "center",
                  }}
                >
                  {im.tags?.slice(0, 3).map((t: string, ti: number) => (
                    <PinChip key={t} color={im.colors?.[ti % (im.colors?.length || 1)]}>{t}</PinChip>
                  ))}
                  {im.tags?.length > 3 && <span className="pd-mono" style={{ fontSize: 10, color: "var(--pd-ink-faint)" }}>+{im.tags.length - 3}</span>}
                </span>
              </td>
              <td
                style={{
                  padding: "4px 8px",
                  borderBottom: "1px solid var(--pd-line)",
                  textAlign: "left",
                  verticalAlign: "middle",
                }}
              >
                <span style={{ display: "inline-flex", justifyContent: "flex-start", width: "100%" }}>
                  <PinSwatches pad={5} colors={im.colors ?? []} size={11} gap={3} />
                </span>
              </td>
              <td
                style={{
                  padding: "4px 8px",
                  borderBottom: "1px solid var(--pd-line)",
                  verticalAlign: "top",
                  textAlign: "left",
                  maxWidth: 260,
                }}
              >
                {srefIds.length > 0 ? (
                  <span
                    style={{
                      display: "inline-flex",
                      flexWrap: "nowrap",
                      gap: 6,
                      justifyContent: "flex-start",
                      alignItems: "center",
                      maxWidth: "100%",
                      overflow: "hidden",
                    }}
                  >
                    {visibleSrefIds.map((id) => (
                      <PinChip key={`${String(im._id)}-sref-${id}`} mono tone="softBlue">
                        {id}
                      </PinChip>
                    ))}
                    {hiddenSrefCount > 0 ? (
                      <span className="pd-mono" style={{ fontSize: 10, color: "var(--pd-ink-faint)" }}>
                        +{hiddenSrefCount}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="pd-mono" style={{ color: "var(--pd-ink-faint)" }}>—</span>
                )}
              </td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink-dim)" }} className="pd-mono">{im.likes}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink-dim)" }} className="pd-mono">{im.views}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
