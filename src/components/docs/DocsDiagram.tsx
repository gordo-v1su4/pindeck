import React from "react";

/**
 * Diagram primitives for the in-app docs, drawn per the Diagram Design skill
 * (diagramdesign.dev): inline SVG, orthogonal connectors, rx=6 nodes, 4px grid,
 * accent on 1–2 focal nodes only, mono for technical sublabels, no shadows.
 * Every colour is a Pindeck CSS variable, so the Tweaks accent and typography
 * re-skin the diagrams live.
 */

export type NodeKind = "focal" | "service" | "store" | "external" | "input" | "async";

const NODE_STYLE: Record<NodeKind, { fill: string; stroke: string; dash?: string; tag: string }> = {
  focal: { fill: "var(--pd-accent-soft)", stroke: "var(--pd-accent)", tag: "var(--pd-accent-ink)" },
  service: { fill: "var(--pd-bg-2)", stroke: "var(--pd-line-hi)", tag: "var(--pd-ink-dim)" },
  store: { fill: "var(--pd-panel-2)", stroke: "var(--pd-line-hi)", tag: "var(--pd-ink-dim)" },
  external: { fill: "var(--pd-bg-1)", stroke: "var(--pd-line-strong)", tag: "var(--pd-ink-faint)" },
  input: { fill: "rgba(255,255,255,0.025)", stroke: "var(--pd-line-strong)", tag: "var(--pd-ink-faint)" },
  async: { fill: "var(--pd-bg-1)", stroke: "var(--pd-line-hi)", dash: "5,4", tag: "var(--pd-ink-faint)" },
};

export function DiagramFrame({
  id,
  title,
  caption,
  width,
  height,
  children,
}: {
  id: string;
  title: string;
  caption?: string;
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  const [zoomed, setZoomed] = React.useState(false);
  return (
    <figure
      style={{
        margin: 0,
        border: "1px solid var(--pd-line-strong)",
        borderRadius: "var(--pd-radius)",
        background: "var(--pd-bg-1)",
        overflow: "hidden",
      }}
    >
      <div className="pd-board-section-head">
        <div style={{ minWidth: 0 }}>
          <div className="pd-board-section-title">{title}</div>
          <div className="pd-board-section-meta">Fig. {id}</div>
        </div>
        <button
          type="button"
          className="pd-docs-diagram-toggle pd-mono"
          aria-pressed={zoomed}
          onClick={() => setZoomed((value) => !value)}
        >
          {zoomed ? "Fit diagram" : "Zoom diagram"}
        </button>
      </div>
      <div className="pd-scroll" style={{ overflowX: "auto" }}>
        <svg
          role="img"
          className="pd-docs-diagram"
          data-zoomed={zoomed}
          aria-label={title}
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: "block", width: "100%", minWidth: Math.min(width, 640), height: "auto" }}
        >
          <title>{title}</title>
          <defs>
            <pattern id={`dots-${id}`} width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,0.06)" />
            </pattern>
            <marker id={`arrow-${id}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" style={{ fill: "var(--pd-ink-faint)" }} />
            </marker>
            <marker id={`arrow-accent-${id}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" style={{ fill: "var(--pd-accent)" }} />
            </marker>
          </defs>
          <rect width={width} height={height} fill={`url(#dots-${id})`} />
          <DiagramIdContext.Provider value={id}>{children}</DiagramIdContext.Provider>
        </svg>
      </div>
      {caption ? (
        <figcaption
          style={{
            padding: "9px 12px",
            borderTop: "1px solid var(--pd-line)",
            fontSize: 11.5,
            color: "var(--pd-ink-dim)",
            lineHeight: 1.5,
          }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

const DiagramIdContext = React.createContext("0");

export function DNode({
  x,
  y,
  w,
  h = 56,
  kind = "service",
  tag,
  name,
  sub,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  kind?: NodeKind;
  tag?: string;
  name: string;
  sub?: string;
}) {
  const s = NODE_STYLE[kind];
  const textX = x + 12;
  const nameY = tag ? y + 34 : y + h / 2 - (sub ? 2 : -4);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} style={{ fill: "var(--pd-bg)" }} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        strokeWidth={1}
        strokeDasharray={s.dash}
        style={{ fill: s.fill, stroke: s.stroke }}
      />
      {tag ? (
        <text
          x={textX}
          y={y + 16}
          style={{
            fill: s.tag,
            fontFamily: "var(--pd-font-mono)",
            fontSize: 8.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {tag}
        </text>
      ) : null}
      <text
        x={textX}
        y={nameY}
        style={{
          fill: kind === "focal" ? "var(--pd-accent-ink)" : "var(--pd-ink)",
          fontFamily: "var(--pd-font-sans)",
          fontSize: 12.5,
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        {name}
      </text>
      {sub ? (
        <text
          x={textX}
          y={nameY + 15}
          style={{ fill: "var(--pd-ink-faint)", fontFamily: "var(--pd-font-mono)", fontSize: 9.5 }}
        >
          {sub}
        </text>
      ) : null}
    </g>
  );
}

/** Orthogonal connector. `points` are [x,y] corners; elbows are rounded at r=8. */
export function DEdge({
  points,
  accent = false,
  dashed = false,
  label,
  labelAt,
}: {
  points: Array<[number, number]>;
  accent?: boolean;
  dashed?: boolean;
  label?: string;
  /** Explicit label centre; defaults to the middle of the longest segment. */
  labelAt?: [number, number];
}) {
  const id = React.useContext(DiagramIdContext);
  const d = roundedPath(points, 8);
  let lx = 0;
  let ly = 0;
  if (label) {
    if (labelAt) {
      [lx, ly] = labelAt;
    } else {
      let best = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const [ax, ay] = points[i];
        const [bx, by] = points[i + 1];
        const len = Math.abs(bx - ax) + Math.abs(by - ay);
        if (len > best) {
          best = len;
          lx = (ax + bx) / 2;
          ly = (ay + by) / 2;
          if (ax === bx) lx += 8; // beside vertical segments, never on the line
          else ly -= 9;
        }
      }
    }
  }
  const labelW = label ? label.length * 5.6 + 10 : 0;
  const anchorStart = !labelAt && isVerticalLabel(points);
  return (
    <g>
      <path
        d={d}
        fill="none"
        strokeWidth={accent ? 1.4 : 1}
        strokeDasharray={dashed ? "5,4" : undefined}
        markerEnd={`url(#${accent ? "arrow-accent" : "arrow"}-${id})`}
        style={{ stroke: accent ? "var(--pd-accent)" : "var(--pd-ink-faint)" }}
      />
      {label ? (
        <g>
          <rect
            x={anchorStart ? lx - 5 : lx - labelW / 2}
            y={ly - 7}
            width={labelW}
            height={13}
            rx={2}
            style={{ fill: "var(--pd-bg-1)" }}
          />
          <text
            x={lx}
            y={ly + 3}
            textAnchor={anchorStart ? "start" : "middle"}
            style={{
              fill: accent ? "var(--pd-accent-ink)" : "var(--pd-ink-faint)",
              fontFamily: "var(--pd-font-mono)",
              fontSize: 8.5,
              letterSpacing: "0.06em",
            }}
          >
            {label}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function isVerticalLabel(points: Array<[number, number]>) {
  let best = 0;
  let vertical = false;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const len = Math.abs(bx - ax) + Math.abs(by - ay);
    if (len > best) {
      best = len;
      vertical = ax === bx;
    }
  }
  return vertical;
}

function roundedPath(points: Array<[number, number]>, r: number) {
  if (points.length < 2) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const inLen = Math.abs(cx - px) + Math.abs(cy - py);
    const outLen = Math.abs(nx - cx) + Math.abs(ny - cy);
    const rr = Math.min(r, inLen / 2, outLen / 2);
    const ix = cx - Math.sign(cx - px) * rr;
    const iy = cy - Math.sign(cy - py) * rr;
    const ox = cx + Math.sign(nx - cx) * rr;
    const oy = cy + Math.sign(ny - cy) * rr;
    d += ` L${ix},${iy} Q${cx},${cy} ${ox},${oy}`;
  }
  const last = points[points.length - 1];
  d += ` L${last[0]},${last[1]}`;
  return d;
}

/** Zone / boundary box with an eyebrow label (trust boundary, host, lane). */
export function DZone({
  x,
  y,
  w,
  h,
  label,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        strokeDasharray="2,4"
        style={{ fill: "rgba(255,255,255,0.012)", stroke: "var(--pd-line-hi)" }}
      />
      <text
        x={x + 10}
        y={y + 15}
        style={{
          fill: "var(--pd-ink-faint)",
          fontFamily: "var(--pd-font-mono)",
          fontSize: 8.5,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </text>
    </g>
  );
}
