import type { CSSProperties, ReactNode } from "react";

const SECTION_HEADING_STYLE: CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--pd-ink-faint)",
  marginBottom: 8,
  marginTop: 4,
};

const TYPE_COLUMN_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  marginBottom: 10,
};

const CHIP_WRAP_STYLE: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 5,
  marginBottom: 10,
};

function typeRowStyle(selected: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "4px 6px",
    borderRadius: 4,
    border: "1px solid transparent",
    background: selected ? "var(--pd-accent-soft)" : "transparent",
    color: selected ? "var(--pd-accent-ink)" : "var(--pd-ink-dim)",
    fontSize: 11.5,
    cursor: "pointer",
    textAlign: "left",
  };
}

function chipStyle(selected: boolean): CSSProperties {
  return {
    padding: "3px 7px",
    borderRadius: 3,
    fontSize: 10.5,
    border: selected ? "1px solid transparent" : "1px solid var(--pd-line-strong)",
    background: selected ? "var(--pd-accent-soft)" : "transparent",
    color: selected ? "var(--pd-accent-ink)" : "var(--pd-ink-dim)",
    cursor: "pointer",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

/** Section title (Type / Genre / Style) in sidebar aggregations */
export function LibraryAggregationSectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="pd-mono" style={SECTION_HEADING_STYLE}>
      {children}
    </div>
  );
}

export function LibraryAggregationTypeColumn({ children }: { children: ReactNode }) {
  return <div style={TYPE_COLUMN_STYLE}>{children}</div>;
}

export function LibraryAggregationChipWrap({ children }: { children: ReactNode }) {
  return <div style={CHIP_WRAP_STYLE}>{children}</div>;
}

/** Full-width row: label + optional count badge (group / type facet) */
export function LibraryAggregationTypeRowButton(props: {
  label: ReactNode;
  count?: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const { label, count, selected, onToggle } = props;
  return (
    <button type="button" onClick={onToggle} style={typeRowStyle(selected)}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {count != null ? (
        <span className="pd-mono" style={{ fontSize: 10, color: "var(--pd-ink-faint)", flexShrink: 0 }}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

/** Compact chip (genre / style facet) — shared visuals */
export function LibraryAggregationFacetChip(props: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const { label, selected, onToggle } = props;
  return (
    <button type="button" onClick={onToggle} style={chipStyle(selected)}>
      {label}
    </button>
  );
}
