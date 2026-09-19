import React, { Component, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PinIcon, PinHotkey } from "@/components/ui/pindeck";
import {
  defaultLibraryFilters,
  normalizeLibraryGroup,
  type LibraryFilters,
} from "@/lib/libraryFilters";
import {
  LibraryAggregationChipWrap,
  LibraryAggregationFacetChip,
  LibraryAggregationSectionHeading,
  LibraryAggregationTypeColumn,
  LibraryAggregationTypeRowButton,
} from "@/components/pd/LibraryAggregationFilterParts";
import { APP_VIEWS, type AppViewId, type GalleryDisplayMode } from "./types";
import { buildSidebarColorRows } from "./sidebarColors";

/** When `libraryAggregations` errors (e.g. Convex not redeployed), don't blank the shell. */
class LibraryAggregationsErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(e: unknown) {
    console.warn("[Pindeck] libraryAggregations failed — deploy Convex?", e);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function SidebarFilterControls({
  libraryFilter,
  setLibraryFilter,
  activeView,
}: {
  libraryFilter: LibraryFilters;
  setLibraryFilter: React.Dispatch<React.SetStateAction<LibraryFilters>>;
  activeView: AppViewId;
}) {
  const images = useQuery(api.images.list, { limit: 1000 });
  const [sidebarColorPickerOpen, setSidebarColorPickerOpen] = useState(false);
  const [sidebarColorPickerPos, setSidebarColorPickerPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const sidebarColorControlRef = React.useRef<HTMLDivElement>(null);
  const sidebarColorLabelRef = React.useRef<HTMLLabelElement>(null);
  const sidebarColorInputRef = React.useRef<HTMLInputElement>(null);
  const sidebarColorRows = React.useMemo(
    () => buildSidebarColorRows(images),
    [images],
  );

  React.useEffect(() => {
    if (!sidebarColorPickerOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        sidebarColorControlRef.current?.contains(target)
      ) {
        return;
      }
      setSidebarColorPickerOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSidebarColorPickerOpen(false);
      sidebarColorInputRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [sidebarColorPickerOpen]);

  const openSidebarColorPicker = () => {
    const rect = sidebarColorLabelRef.current?.getBoundingClientRect();
    const left = rect
      ? Math.min(rect.left, Math.max(8, window.innerWidth - 336))
      : 102;
    const top = rect ? rect.bottom + 6 : 560;
    setSidebarColorPickerPos({ left, top });
    setSidebarColorPickerOpen(true);
  };

  const setColorFilter = (color: string | null) => {
    setLibraryFilter((f) => ({ ...f, colorHex: color }));
    setSidebarColorPickerOpen(false);
  };
  const colorCheckboxChecked =
    Boolean(libraryFilter.colorHex) || sidebarColorPickerOpen;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
          marginBottom: 6,
        }}
      >
        <div
          className="pd-mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--pd-ink-faint)",
          }}
        >
          Filters
        </div>
        <button
          type="button"
          className="pd-mono"
          onClick={() => setLibraryFilter(defaultLibraryFilters())}
          style={{
            fontSize: 9,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            background: "transparent",
            border: "none",
            color: "var(--pd-ink-faint)",
            cursor: "pointer",
            padding: "2px 0",
          }}
        >
          Clear
        </button>
      </div>
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
            setLibraryFilter((f) => ({ ...f, hasSref: e.target.checked }))
          }
        />
        <span className="pd-filter-checkbox-box" aria-hidden="true" />
        Has sref
      </label>
      <div ref={sidebarColorControlRef} style={{ position: "relative" }}>
        <label
          ref={sidebarColorLabelRef}
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
            ref={sidebarColorInputRef}
            type="checkbox"
            checked={colorCheckboxChecked}
            onChange={(e) => {
              if (e.target.checked) {
                openSidebarColorPicker();
              } else {
                setColorFilter(null);
                setSidebarColorPickerOpen(false);
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
        {libraryFilter.colorHex && (
          <button
            type="button"
            onClick={() => setLibraryFilter((f) => ({ ...f, colorHex: null }))}
            className="pd-mono"
            style={{
              marginLeft: 8,
              fontSize: 9,
              color: "var(--pd-ink-faint)",
              padding: 0,
            }}
          >
            Clear
          </button>
        )}
        {sidebarColorPickerOpen && (
          <div
            className="pd-color-popover"
            style={{
              position: "fixed",
              top: sidebarColorPickerPos?.top ?? 0,
              left: sidebarColorPickerPos?.left ?? 0,
              zIndex: 80,
              display: "flex",
              flexDirection: "column",
              gap: 5,
              width: 320,
              maxHeight: 208,
              overflowX: "hidden",
              overflowY: "auto",
              padding: 8,
              borderRadius: 5,
              border: "1px solid var(--pd-glass-line)",
              background: "var(--pd-glass-bg)",
              backdropFilter: "blur(var(--pd-glass-blur)) saturate(1.25)",
              boxShadow: "var(--pd-glass-shadow)",
            }}
          >
            {sidebarColorRows.length > 0 ? (
              sidebarColorRows.map((row, rowIndex) => (
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
                        onClick={() => setColorFilter(active ? null : color)}
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
    </>
  );
}

function SidebarLibraryAggregationBody({
  libraryFilter,
  setLibraryFilter,
  activeView,
}: {
  libraryFilter: LibraryFilters;
  setLibraryFilter: React.Dispatch<React.SetStateAction<LibraryFilters>>;
  activeView: AppViewId;
}) {
  const aggregations = useQuery(api.images.libraryAggregations);
  const groupRows = React.useMemo(() => {
    if (!aggregations) return [];
    const counts = new Map<string, number>();
    for (const row of aggregations.byGroup) {
      const value = normalizeLibraryGroup(row.value);
      counts.set(value, (counts.get(value) ?? 0) + row.count);
    }
    return Array.from(counts, ([value, count]) => ({ value, count })).sort(
      (a, b) => {
        if (a.value === "") return 1;
        if (b.value === "") return -1;
        return b.count - a.count || a.value.localeCompare(b.value);
      },
    );
  }, [aggregations]);

  return (
    <>
      {aggregations === undefined && (
        <div
          className="pd-mono"
          style={{ fontSize: 10, color: "var(--pd-ink-faint)" }}
        >
          Loading filters…
        </div>
      )}
      {aggregations !== undefined && groupRows.length > 0 && (
        <>
          <LibraryAggregationSectionHeading>
            Type
          </LibraryAggregationSectionHeading>
          <LibraryAggregationTypeColumn>
            {groupRows.slice(0, 16).map((row) => {
              const value = row.value;
              const label = value ? value : "Unassigned";
              const selected =
                libraryFilter.group !== null && libraryFilter.group === value;
              return (
                <LibraryAggregationTypeRowButton
                  key={`g-${value || "empty"}`}
                  label={label}
                  count={row.count}
                  selected={selected}
                  onToggle={() =>
                    setLibraryFilter((f) => ({
                      ...f,
                      group: f.group === value ? null : value,
                    }))
                  }
                />
              );
            })}
          </LibraryAggregationTypeColumn>
        </>
      )}
      {aggregations !== undefined && aggregations.byGenre.length > 0 && (
        <>
          <LibraryAggregationSectionHeading>
            Genre
          </LibraryAggregationSectionHeading>
          <LibraryAggregationChipWrap>
            {aggregations.byGenre.slice(0, 16).map((row) => {
              const selected = libraryFilter.genre === row.value;
              return (
                <LibraryAggregationFacetChip
                  key={`genre-${row.value}`}
                  label={row.value}
                  selected={selected}
                  onToggle={() =>
                    setLibraryFilter((f) => ({
                      ...f,
                      genre: f.genre === row.value ? null : row.value,
                    }))
                  }
                />
              );
            })}
          </LibraryAggregationChipWrap>
        </>
      )}
      {aggregations !== undefined && aggregations.byStyle.length > 0 && (
        <>
          <LibraryAggregationSectionHeading>
            Style / medium
          </LibraryAggregationSectionHeading>
          <LibraryAggregationChipWrap>
            {aggregations.byStyle.slice(0, 14).map((row) => {
              const selected = libraryFilter.style === row.value;
              return (
                <LibraryAggregationFacetChip
                  key={`style-${row.value}`}
                  label={row.value}
                  selected={selected}
                  onToggle={() =>
                    setLibraryFilter((f) => ({
                      ...f,
                      style: f.style === row.value ? null : row.value,
                    }))
                  }
                />
              );
            })}
          </LibraryAggregationChipWrap>
        </>
      )}
      <SidebarFilterControls
        libraryFilter={libraryFilter}
        setLibraryFilter={setLibraryFilter}
        activeView={activeView}
      />
    </>
  );
}

export function Sidebar({
  activeView,
  onView,
  libraryFilter,
  setLibraryFilter,
  galleryDisplayMode,
  setGalleryDisplayMode,
  collapsed,
  onToggleCollapsed,
}: {
  activeView: AppViewId;
  onView: (v: string) => void;
  libraryFilter: LibraryFilters;
  setLibraryFilter: React.Dispatch<React.SetStateAction<LibraryFilters>>;
  galleryDisplayMode: GalleryDisplayMode;
  setGalleryDisplayMode: React.Dispatch<
    React.SetStateAction<GalleryDisplayMode>
  >;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const displayModes: Array<{
    id: GalleryDisplayMode;
    label: string;
    icon: string;
  }> = [
    { id: "random", label: "Random", icon: "masonry" },
    { id: "project-rows", label: "Project Rows", icon: "film" },
    { id: "sref-rows", label: "SREF Rows", icon: "tree" },
  ];

  return (
    <aside
      id="pindeck-sidebar"
      className={collapsed ? "pd-sidebar is-collapsed" : "pd-sidebar"}
      aria-label="Pindeck sidebar"
      aria-hidden={collapsed}
      style={{
        width: 208,
        flexShrink: 0,
        background: "var(--pd-bg-1)",
        borderRight: "1px solid var(--pd-line)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 44,
          padding: "0 14px",
          borderBottom: "1px solid var(--pd-line)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            background: "#000",
            border: "1px solid var(--pd-line-hi)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            fontStyle: "italic",
            letterSpacing: "-0.06em",
          }}
        >
          P/
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            fontStyle: "italic",
            flex: 1,
          }}
        >
          <span style={{ color: "var(--pd-ink)" }}>PIN</span>
          <span style={{ color: "var(--pd-accent)" }}>DECK</span>
        </div>
        <button
          type="button"
          className="pd-sidebar-collapse-button"
          aria-label="Collapse sidebar"
          aria-expanded="true"
          aria-controls="pindeck-sidebar"
          title="Collapse sidebar"
          onClick={onToggleCollapsed}
        >
          <PinIcon name="chevron-left" size={13} stroke={1.8} />
        </button>
      </div>

      <div
        style={{
          padding: "10px 8px 6px",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {APP_VIEWS.map((n) => (
          <button
            key={n.id}
            onClick={() => onView(n.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "6px 8px",
              borderRadius: 4,
              color:
                activeView === n.id ? "var(--pd-ink)" : "var(--pd-ink-dim)",
              background:
                activeView === n.id ? "rgba(255,255,255,0.05)" : "transparent",
              fontSize: 12,
              fontWeight: 500,
              textAlign: "left",
              transition: "background 120ms",
            }}
          >
            <PinIcon
              name={n.icon}
              size={13}
              stroke={activeView === n.id ? 1.8 : 1.5}
            />
            <span style={{ flex: 1 }}>{n.label}</span>
            <PinHotkey k={n.hk} />
          </button>
        ))}
      </div>

      <div
        className="pd-scroll"
        style={{ flex: 1, overflow: "auto", padding: "8px 12px 14px" }}
      >
        {activeView === "gallery" && (
          <div
            style={{
              padding: "4px 4px 12px",
              borderBottom: "1px solid var(--pd-line)",
              marginBottom: 10,
            }}
          >
            <div
              className="pd-mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--pd-ink-faint)",
                marginBottom: 7,
              }}
            >
              View
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {displayModes.map((mode) => {
                const selected = galleryDisplayMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    className="pd-sidebar-display-row"
                    onClick={() => setGalleryDisplayMode(mode.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "6px 7px",
                      borderRadius: 4,
                      border: "0",
                      background: selected
                        ? "rgba(255,255,255,0.05)"
                        : "transparent",
                      color: selected
                        ? "var(--pd-accent-ink)"
                        : "var(--pd-ink-dim)",
                      fontSize: 11.5,
                      textAlign: "left",
                    }}
                  >
                    <PinIcon name={mode.icon} size={12} />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ padding: "4px 4px 4px" }}>
          <LibraryAggregationsErrorBoundary
            fallback={
              <>
                <div
                  className="pd-mono"
                  style={{
                    fontSize: 10,
                    color: "var(--pd-ink-faint)",
                    marginBottom: 10,
                    lineHeight: 1.45,
                  }}
                >
                  Type / genre / style counts need the latest Convex deploy. You
                  can still filter with the options below.
                </div>
                <SidebarFilterControls
                  libraryFilter={libraryFilter}
                  setLibraryFilter={setLibraryFilter}
                  activeView={activeView}
                />
              </>
            }
          >
            <SidebarLibraryAggregationBody
              libraryFilter={libraryFilter}
              setLibraryFilter={setLibraryFilter}
              activeView={activeView}
            />
          </LibraryAggregationsErrorBoundary>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--pd-line)",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 10.5,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--pd-green)",
            boxShadow: "0 0 8px var(--pd-green)",
          }}
        />
        <span className="pd-mono" style={{ color: "var(--pd-ink-mute)" }}>
          convex · live
        </span>
      </div>
    </aside>
  );
}
