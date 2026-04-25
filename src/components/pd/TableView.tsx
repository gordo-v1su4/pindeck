import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PinChip, PinSwatches } from "@/components/ui/pindeck";

interface TableViewProps {
  search: string;
  onOpenImage: (img: any) => void;
}

export function TableView({ search, onOpenImage }: TableViewProps) {
  const images = useQuery(api.images.list, { limit: 1000 });
  const [sort, setSort] = useState<{ by: string; dir: "asc" | "desc" }>({ by: "title", dir: "asc" });

  const filtered = useMemo(() => {
    if (!images) return [];
    let data = [...images];
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
  }, [images, search, sort]);

  const headerCell = (label: string, key: string, w?: number) => (
    <th
      style={{
        padding: "7px 8px", textAlign: "left", fontSize: 10,
        letterSpacing: "0.06em", textTransform: "uppercase",
        color: sort.by === key ? "var(--pd-ink)" : "var(--pd-ink-faint)",
        fontWeight: 600, fontFamily: "var(--pd-font-mono)", borderBottom: "1px solid var(--pd-line-strong)",
        background: "var(--pd-bg-1)", position: "sticky", top: 0, cursor: "pointer", width: w,
      }}
      onClick={() => setSort({ by: key, dir: sort.by === key && sort.dir === "asc" ? "desc" : "asc" })}
    >
      {label}
    </th>
  );

  if (images === undefined) {
    return <div className="pd-fade-in" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--pd-ink-faint)" }}>Loading…</div>;
  }

  const fmtSref = (s: string | undefined) => {
    if (!s) return "—";
    const match = s.match(/\d+/);
    return match ? `--sref ${match[0]}` : "—";
  };

  return (
    <div className="pd-scroll pd-fade-in" style={{ flex: 1, overflow: "auto", padding: 0, background: "var(--pd-bg)" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 11.5 }}>
        <thead>
          <tr>
            {headerCell("", "_id", 52)}
            {headerCell("Title", "title")}
            {headerCell("Type", "group", 100)}
            {headerCell("Genre", "genre", 80)}
            {headerCell("Shot", "shot", 90)}
            {headerCell("Style", "style", 90)}
            {headerCell("Tags", "tags")}
            {headerCell("Palette", "colors", 80)}
            {headerCell("Sref", "sref", 110)}
            {headerCell("♥", "likes", 44)}
            {headerCell("👁", "views", 56)}
          </tr>
        </thead>
        <tbody>
          {filtered.map((im, i) => (
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
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink)", fontWeight: 500 }}>{im.title}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink-dim)" }}>{im.group || "—"}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink-dim)" }}>{im.genre || "—"}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink-dim)" }}>{im.shot || "—"}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink-dim)" }}>{im.style || "—"}</td>
              <td style={{ padding: "4px 8px", borderBottom: "1px solid var(--pd-line)" }}>
                <span style={{ display: "inline-flex", gap: 3, flexWrap: "wrap" }}>
                  {im.tags?.slice(0, 3).map((t: string, ti: number) => (
                    <PinChip key={t} color={im.colors?.[ti % (im.colors?.length || 1)]}>{t}</PinChip>
                  ))}
                  {im.tags?.length > 3 && <span className="pd-mono" style={{ fontSize: 10, color: "var(--pd-ink-faint)" }}>+{im.tags.length - 3}</span>}
                </span>
              </td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)" }}>
                <PinSwatches colors={im.colors?.slice(0, 5) || []} size={10} />
              </td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink-mute)", whiteSpace: "nowrap" }} className="pd-mono">{fmtSref(im.sref)}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink-dim)" }} className="pd-mono">{im.likes}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--pd-line)", color: "var(--pd-ink-dim)" }} className="pd-mono">{im.views}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
