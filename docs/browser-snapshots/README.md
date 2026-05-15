# Browser snapshots (visual checkpoints)

Captured from the active local app or production Pindeck site. Files should be copied into this folder from the browser-tool temp export path so they stay in-repo for diffs and design reviews.

## Current snapshots (2026-04-28)

| Image | Purpose |
|--------|---------|
| `2026-04-28-local-pindeck-table.png` | **Local baseline:** Table + **Re-sample palettes**, live Convex **`images.colors`** before centroid pipeline fully shipped. |
| `2026-04-28-local-table-after-centroid-tags.png` | **Local after UI/server code changes:** SREF **`PinChip` tags**, **`PinSwatches`** hex normalization + 5-slot padding; screenshot still shows **legacy stored palette** values until Convex is deployed **and** **Re-sample palettes** completes. |
| `pindeck-gallery-hover-check.png` | **Local Gallery (vite preview `:4173`):** checkpoint after **[pd]** tile chrome work — smaller like/bookmark (hover/focus), softer **VAR** chip; headless hover may not show controls in a static PNG—verify hover in a real browser. |

**Interpretation checklist (don’t confuse code vs data):**

1. **`src/lib/colorPaletteCore.ts`** averages real pixels per cluster (centroids) and drops fringe purple/magenta in warm scenes — runs only when **`internalExtractAndStoreColors`** runs (upload, ingest paths, **Re-sample palettes** button).
2. Until you deploy self-hosted Convex with **`bun run deploy:convex`** and enqueue refresh jobs, **`images.colors` in Convex is old** → UI can still paint purple from stale rows.
3. Compare local changes against the active production site, not old prototype deployments.

### Production Pindeck on Vercel

The current production frontend is the active Vercel project **`pindeck`**:

- Production URL: `https://pindeck.dev`
- Alternate production alias: `https://www.pindeck.dev`
- Git branch alias: `https://pindeck-git-main-gordo-v1su4s-projects.vercel.app`

Ignore stale duplicate Vercel project/status contexts. Do not use them for production health checks, browser comparisons, or deploy validation.

## How to refresh

1. Run the frontend (`PORT=3000 bunx vite --host 127.0.0.1 --port 3000` or your usual script).
2. In the native Codex browser or another browser tool: navigate, open the target view, and authenticate if needed.
3. Capture a screenshot with a filename under `docs/browser-snapshots/`, then copy the exported file into this folder if the browser tool saves it elsewhere.
4. For production comparison, capture `https://pindeck.dev`.
