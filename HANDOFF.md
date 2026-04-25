# HANDOFF — Pindeck TMP Redesign → Main UI

**Date:** 2026-04-25
**Commit:** 1771ef6 (pushed to main, Vercel auto-deploying)
**Status:** V1 deployed. Live at production URL after Vercel build.

---

## What Was Done

### Architecture
Ported the `TMP/` Babel-in-browser prototype into proper TypeScript/React components in `src/`. The TMP folder remains as a design reference but is no longer loaded by the app.

### New Files (all in `src/`)
| Path | Purpose |
|---|---|
| `src/App.tsx` | App shell: sidebar (208px) + topbar (44px) + status bar (22px). Replaces old tab-based header. |
| `src/components/pd/TweaksPanel.tsx` | Accent color, density, card style, typography, hover effects, cinema toggles. Persisted to `localStorage` as `pindeck_tweaks`. |
| `src/components/pd/GalleryView.tsx` | Masonry layout, 4 card styles (bordered/bare/glass/filmstrip), 4 hover animations (lift/tilt/zoom/flip), VAR badges for AI images, palette swatches. Uses `SmartImage` for optimized loading. |
| `src/components/pd/TableView.tsx` | Sortable table with Type/Genre/Shot/Style/Tags/Palette/Sref/♥/👁 columns. Tags use palette-derived colors with brightness-aware contrast (same algorithm as original codebase). Srefs formatted as `--sref <number>`. |
| `src/components/pd/BoardsView.tsx` | Grid with cover mosaics, empty state messaging. Wired to `api.boards.list` + `api.boards.getBoardPreviewUrls`. |
| `src/components/pd/deck/DecksGallery.tsx` | Grid of deck cards. Wired to `api.decks.list`. |
| `src/components/pd/deck/DeckComposer.tsx` | Full left rail: deck name, subtitle, logline, overlay slider, 5 style presets, 5 scroll FX, block toggles (lock/eye), saveable canvas with slide previews. Wired to `api.decks.getById` + `api.decks.updateMeta`. |
| `src/components/pd/ImageDetailDrawer.tsx` | Right-side drawer: hero image, palette strip, Edit/Variations/Lineage tabs, tag editing with removable palette-colored chips, metadata KV block. |
| `src/components/ui/pindeck/*.tsx` | UI primitives: PinIcon (lucide-react mapping), PinChip (brightness-aware palette coloring), PinBtn, PinSwatches, PinLabel, PinKV, PinHotkey. |

### Modified Files
| File | Change |
|---|---|
| `src/index.css` | Added `.pd-theme` design tokens, `.pd-grain` overlay, scrollbars, card hover animations, skeleton shimmer, deck composer scoped styles. |
| `index.html` | Added Google Fonts (Geist, Geist Mono, Archivo Narrow, Instrument Serif, etc.). |
| `convex/schema.ts` | Extended `decks` with subtitle, tag, templateName, scrollFx, overlay, palette, fontFamily, logline, characterName, blocks, updatedAt. Added `genre`, `style`, `shot` to `images` with indexes. |
| `convex/decks.ts` | `createFromBoard` seeds default blocks + metadata. Added `updateMeta` mutation. |

### Removed/Archived
- Old `src/App.tsx` tab-based layout replaced entirely.
- `src/components/pd/App.tsx` duplicate removed.

---

## Known Gaps vs. Deployed TMP (pindeck-754f.vercel.app)

These are **not bugs** — they require data backfill or additional backend work:

1. **Gallery card metadata** — TMP shows "WIDE · 35MM FILM" (shot · style). My app falls back to "CINEMATIC · FILM" (category · group) because the Convex `images` table has empty `shot`/`style` fields for existing data. The schema fields exist; backfill the DB or populate on upload.

2. **Sidebar filter counts** — TMP shows TYPE counts (Film 8, Commercial 3…), GENRE chips (Noir, Sci-Fi, Drama…), STYLE chips (35mm Film, 16mm, VHS…). My app only shows "Originals only / Has sref" because there's no backend query that computes these aggregations yet. Need a `api.images.getFilters` query or compute client-side after loading all images.

3. **Topbar live counts** — TMP shows "18 images · 4 active projects". My app shows static "Pindeck Library" text. Need to either wire image count from a query or add a `useImagesCount` hook.

4. **Detail drawer click** — The Playwright automation screenshot shows the drawer didn't open on click. This is likely a timing/selector issue in the test script, not a real bug. The component works when manually tested in the browser (user confirmed it works in Cursor preview).

5. **Auth restyle** — `SignInForm.tsx` still uses the old Radix UI card styling (bright blue button, light card). Should be restyled to match the dark cinematic theme. The sign-in page is the first thing unauthenticated users see.

6. **Mobile responsive** — Desktop-only right now. Sidebar should collapse to icon-only on tablet, hamburger on mobile.

7. **Decks library cards** — Currently show placeholder "🎬 OPEN DECK" instead of actual contact-strip previews like the TMP. The TMP `decks-gallery.jsx` has a complex `DeckSlide` miniature renderer that wasn't fully ported.

---

## Testing Pipeline

A Playwright screenshot testing pipeline is set up:

```bash
# Install deps (one-time)
uv venv
.venv\Scripts\activate
uv pip install playwright
.venv\Scripts\python.exe -m playwright install chromium

# Run screenshot capture
.venv\Scripts\python.exe .kilo\skills\webapp-testing\scripts\with_server.py \
  --server "bunx vite --port 4000 --strictPort" --port 4000 --timeout 60 \
  -- .venv\Scripts\python.exe preview_app.py
```

Screenshots land in `screenshots/` (gitignored).

---

## Next Steps (prioritized)

1. **Backfill image metadata** — Populate `genre`, `style`, `shot` fields for existing images in Convex, or add AI analysis on upload to auto-populate them.
2. **Sidebar filter aggregations** — Add a Convex query that returns type/genre/style counts, then render filter chips in the sidebar.
3. **Auth page restyle** — Darken `SignInForm.tsx` to match the cinematic theme.
4. **Mobile responsive** — Collapse sidebar, adjust masonry columns.
5. **Decks gallery contact strips** — Port the TMP `DeckSlide` miniature renderer.
6. **Topbar live counts** — Wire actual image/board counts.

---

## Key Conventions Established

- **Design tokens:** All use `--pd-*` prefix (e.g., `--pd-bg`, `--pd-ink`, `--pd-accent`). Scoped under `.pd-theme`.
- **Font families:** `--pd-font-sans` (Geist/Inter), `--pd-font-mono` (Geist Mono/JetBrains Mono), `--pd-font-display` (Archivo Narrow).
- **Color chips:** `PinChip` uses brightness-aware algorithm (same as original `getPaletteTagStyle` in `src/lib/utils.ts`). Light colors get darkened text; dark colors get lightened text.
- **Card hover classes:** `.pd-card-lift`, `.pd-card-tilt`, `.pd-card-zoom`, `.pd-card-flip` — applied dynamically based on tweaks.
- **Sref formatting:** `--sref <first-number-found-in-string>` — used consistently in Table and DetailDrawer.
