import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PinIcon, PinHotkey } from "@/components/ui/pindeck";
import { type LibraryFilters } from "@/lib/libraryFilters";
import { WorkActivity } from "@/components/pd/WorkActivity";
import {
  APP_VIEWS,
  defaultTableVisibleColumns,
  tableColumnOptions,
  type TableColumnKey,
} from "./types";
import { buildSidebarColorRows } from "./sidebarColors";

export function Topbar({
  search,
  setSearch,
  searchInputRef,
  view,
  setView,
  docsUrl,
  tweaksOn,
  onToggleTweaks,
  activityOn,
  onToggleActivity,
  onCloseActivity,
  libraryFilter,
  setLibraryFilter,
  visibleColumns,
  setVisibleColumns,
  accountActions,
}: {
  search: string;
  setSearch: (s: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  view: string;
  setView: (v: string) => void;
  docsUrl: string;
  tweaksOn: boolean;
  onToggleTweaks: () => void;
  activityOn: boolean;
  onToggleActivity: () => void;
  onCloseActivity: () => void;
  libraryFilter: LibraryFilters;
  setLibraryFilter: React.Dispatch<React.SetStateAction<LibraryFilters>>;
  visibleColumns: Record<TableColumnKey, boolean>;
  setVisibleColumns: React.Dispatch<
    React.SetStateAction<Record<TableColumnKey, boolean>>
  >;
  accountActions: React.ReactNode;
}) {
  const images = useQuery(api.images.list, { limit: 1000 });
  const [topFiltersOpen, setTopFiltersOpen] = useState(false);
  const [topColumnsOpen, setTopColumnsOpen] = useState(false);
  const [topColorPickerOpen, setTopColorPickerOpen] = useState(false);
  const topMenuRef = React.useRef<HTMLDivElement>(null);
  const topColorRows = React.useMemo(
    () => buildSidebarColorRows(images),
    [images],
  );
  const topColorChecked = Boolean(libraryFilter.colorHex) || topColorPickerOpen;

  React.useEffect(() => {
    if (!topFiltersOpen && !topColumnsOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && topMenuRef.current?.contains(target))
        return;
      setTopFiltersOpen(false);
      setTopColumnsOpen(false);
      setTopColorPickerOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setTopFiltersOpen(false);
      setTopColumnsOpen(false);
      setTopColorPickerOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [topFiltersOpen, topColumnsOpen]);

  const setTopColorFilter = (color: string | null) => {
    setLibraryFilter((f) => ({ ...f, colorHex: color }));
    setTopColorPickerOpen(false);
  };
  const columnChipStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 24,
    width: "100%",
    padding: "3px 7px",
    borderRadius: 3,
    border: active
      ? "1px solid transparent"
      : "1px solid var(--pd-line-strong)",
    background: active ? "var(--pd-accent-soft)" : "rgba(255,255,255,0.025)",
    color: active ? "var(--pd-accent-ink)" : "var(--pd-ink-dim)",
    fontSize: 10.5,
    fontWeight: 500,
    lineHeight: 1.4,
    cursor: "pointer",
  });
  const toggleColumn = (key: TableColumnKey) => {
    setVisibleColumns((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <header
      className="pd-topbar"
      style={{
        height: 44,
        flexShrink: 0,
        borderBottom: "1px solid var(--pd-line)",
        background: "var(--pd-bg-1)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 12px",
        position: "relative",
        zIndex: 10,
      }}
    >
      <div
        className="pd-search-shell"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--pd-bg-2)",
          border: "1px solid var(--pd-line)",
          borderRadius: 5,
          padding: "5px 8px",
          width: 320,
          maxWidth: "38vw",
        }}
      >
        <PinIcon name="search" size={12} />
        <input
          ref={searchInputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search titles, tags, srefs…"
          style={{
            flex: 1,
            border: 0,
            outline: 0,
            background: "transparent",
            fontSize: 12,
            color: "var(--pd-ink)",
          }}
        />
        <PinHotkey k="⌘K" />
      </div>

      <div
        className="pd-breadcrumb"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11.5,
          color: "var(--pd-ink-mute)",
          marginLeft: 8,
        }}
      >
        <span className="pd-mono">{view}</span>
        <span style={{ color: "var(--pd-ink-faint)" }}>/</span>
        <span>Pindeck Library</span>
      </div>

      <div style={{ flex: 1 }} />

      {view === "table" ? (
        <div
          ref={topMenuRef}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            marginRight: 4,
            position: "relative",
          }}
        >
          {[
            { id: "filters", label: "Filters", icon: "filter" },
            { id: "columns", label: "Columns", icon: "eye" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={
                item.id === "filters" ? topFiltersOpen : topColumnsOpen
              }
              title={`${item.label} controls`}
              onClick={() => {
                if (item.id === "filters") {
                  setTopFiltersOpen((open) => !open);
                  setTopColumnsOpen(false);
                } else {
                  setTopColumnsOpen((open) => !open);
                  setTopFiltersOpen(false);
                }
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 8px",
                borderRadius: 4,
                border: (
                  item.id === "filters" ? topFiltersOpen : topColumnsOpen
                )
                  ? "1px solid transparent"
                  : "1px solid transparent",
                background: (
                  item.id === "filters" ? topFiltersOpen : topColumnsOpen
                )
                  ? "var(--pd-accent-soft)"
                  : "transparent",
                color: (item.id === "filters" ? topFiltersOpen : topColumnsOpen)
                  ? "var(--pd-accent-ink)"
                  : "var(--pd-ink-dim)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <PinIcon name={item.icon} size={13} />
              {item.label}
            </button>
          ))}
          {topFiltersOpen && (
            <div
              className="pd-glass-panel"
              style={{
                position: "absolute",
                top: 34,
                left: 0,
                zIndex: 80,
                width: 232,
                padding: "8px 10px",
              }}
            >
              <label
                className="pd-filter-checkbox"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "3px 0",
                  fontSize: 11.5,
                  color: "var(--pd-ink-dim)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={libraryFilter.originalsOnly}
                  onChange={(e) =>
                    setLibraryFilter((f) => ({
                      ...f,
                      originalsOnly: e.target.checked,
                      noOriginals: e.target.checked ? false : f.noOriginals,
                    }))
                  }
                />
                <span className="pd-filter-checkbox-box" aria-hidden="true" />
                Originals only
              </label>
              <label
                className="pd-filter-checkbox"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "3px 0",
                  fontSize: 11.5,
                  color: "var(--pd-ink-dim)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={libraryFilter.noOriginals}
                  onChange={(e) =>
                    setLibraryFilter((f) => ({
                      ...f,
                      noOriginals: e.target.checked,
                      originalsOnly: e.target.checked ? false : f.originalsOnly,
                    }))
                  }
                />
                <span className="pd-filter-checkbox-box" aria-hidden="true" />
                Variations only
              </label>
              <label
                className="pd-filter-checkbox"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "3px 0",
                  fontSize: 11.5,
                  color: "var(--pd-ink-dim)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={libraryFilter.hasSref}
                  onChange={(e) =>
                    setLibraryFilter((f) => ({
                      ...f,
                      hasSref: e.target.checked,
                    }))
                  }
                />
                <span className="pd-filter-checkbox-box" aria-hidden="true" />
                Has sref
              </label>
              <label
                className="pd-filter-checkbox"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "3px 0",
                  fontSize: 11.5,
                  color: "var(--pd-ink-dim)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={topColorChecked}
                  onChange={(e) => {
                    if (e.target.checked) setTopColorPickerOpen(true);
                    else {
                      setTopColorFilter(null);
                      setTopColorPickerOpen(false);
                    }
                  }}
                />
                <span className="pd-filter-checkbox-box" aria-hidden="true" />
                Color
                {libraryFilter.colorHex && (
                  <span
                    className="pd-mono"
                    style={{
                      color: "var(--pd-ink-faint)",
                      fontSize: 9,
                      marginLeft: 2,
                    }}
                  >
                    {libraryFilter.colorHex}
                  </span>
                )}
              </label>
              {topColorPickerOpen && (
                <div
                  className="pd-color-popover"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    width: 320,
                    maxHeight: 208,
                    overflowX: "hidden",
                    overflowY: "auto",
                    marginTop: 7,
                    padding: 8,
                    borderRadius: 5,
                    border: "1px solid var(--pd-glass-line)",
                    background: "var(--pd-glass-bg)",
                    backdropFilter: "blur(var(--pd-glass-blur)) saturate(1.25)",
                    boxShadow: "var(--pd-glass-shadow)",
                  }}
                >
                  {topColorRows.length > 0 ? (
                    topColorRows.map((row, rowIndex) => (
                      <div
                        key={`${row.join("|")}-${rowIndex}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(5, 56px)",
                          gap: 5,
                        }}
                      >
                        {row.map((color) => {
                          const active = libraryFilter.colorHex === color;
                          return (
                            <button
                              key={`${rowIndex}-${color}`}
                              type="button"
                              title={color}
                              aria-label={`Filter near ${color}`}
                              aria-pressed={active}
                              onClick={() =>
                                setTopColorFilter(active ? null : color)
                              }
                              style={{
                                height: 20,
                                borderRadius: 3,
                                border: active
                                  ? "2px solid var(--pd-ink)"
                                  : "1px solid rgba(255,255,255,0.14)",
                                background: color,
                                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            />
                          );
                        })}
                      </div>
                    ))
                  ) : (
                    <div
                      className="pd-mono"
                      style={{ fontSize: 10, color: "var(--pd-ink-faint)" }}
                    >
                      No sampled colors yet
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {topColumnsOpen && (
            <div
              className="pd-glass-panel"
              style={{
                position: "absolute",
                top: 34,
                left: 86,
                zIndex: 80,
                width: 232,
                padding: 8,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 4,
                }}
              >
                {tableColumnOptions.map((column) => (
                  <button
                    key={column.key}
                    type="button"
                    aria-pressed={visibleColumns[column.key]}
                    onClick={() => toggleColumn(column.key)}
                    style={columnChipStyle(visibleColumns[column.key])}
                  >
                    {column.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setVisibleColumns(defaultTableVisibleColumns)}
                  style={{ ...columnChipStyle(false), gridColumn: "1 / -1" }}
                >
                  Show all
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div
        className="pd-topbar-viewnav"
        style={{ display: "flex", alignItems: "center", gap: 2 }}
      >
        {APP_VIEWS.map((v) => (
          <button
            key={v.id}
            className="pd-topbar-row"
            onClick={() => setView(v.id)}
            title={v.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
              color: view === v.id ? "var(--pd-ink)" : "var(--pd-ink-dim)",
              background:
                view === v.id ? "rgba(255,255,255,0.06)" : "transparent",
            }}
          >
            <PinIcon name={v.icon} size={12} />
            <span className="pd-viewnav-label" data-short={v.short}>
              {v.label}
            </span>
          </button>
        ))}
      </div>

      <a
        href={docsUrl}
        target="_blank"
        rel="noreferrer"
        title="Open Pindeck docs"
        className="pd-topbar-row pd-docs-link"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 8px",
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 500,
          color: "var(--pd-ink-dim)",
          background: "transparent",
          textDecoration: "none",
        }}
      >
        <PinIcon name="docs" size={12} />
        <span>Docs</span>
        <PinIcon name="external" size={10} stroke={1.5} />
      </a>

      <WorkActivity
        open={activityOn}
        onToggle={onToggleActivity}
        onClose={onCloseActivity}
      />

      <button
        onClick={onToggleTweaks}
        title="Tweaks"
        className={
          tweaksOn
            ? "pd-tweaks-trigger pd-tweaks-mobile is-active"
            : "pd-tweaks-trigger pd-tweaks-mobile"
        }
        style={{
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
          border: "0",
          background: "transparent",
          color: tweaksOn ? "var(--pd-accent)" : "var(--pd-ink-dim)",
        }}
      >
        <PinIcon name="bolt" size={13} />
      </button>

      <div
        className="pd-account-shell"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginLeft: 6,
          paddingLeft: 10,
          borderLeft: "1px solid var(--pd-line)",
          flexShrink: 0,
        }}
      >
        {accountActions}
      </div>
    </header>
  );
}
