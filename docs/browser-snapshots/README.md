# Browser snapshots (visual checkpoints)

Captured from **Cursor IDE browser MCP** (`browser_take_screenshot`). Files are copied into this folder from the MCP temp export path so they stay **in-repo** for diffs + design reviews.

## Current snapshots (2026-04-28)

| Image | Purpose |
|--------|---------|
| `2026-04-28-local-pindeck-table.png` | **Local baseline:** Table + **Re-sample palettes**, live Convex **`images.colors`** before centroid pipeline fully shipped. |
| `2026-04-28-local-table-after-centroid-tags.png` | **Local after UI/server code changes:** SREF **`PinChip` tags**, **`PinSwatches`** hex normalization + 5-slot padding; screenshot still shows **legacy stored palette** values until Convex is deployed **and** **Re-sample palettes** completes. |
| `2026-04-28-reference-vercel-pindeck-754f.png` | **Reference prototype:** **`https://pindeck-754f.vercel.app/`** — TMP / unified-ui static deploy (see [`HANDOFF.md`](../../HANDOFF.md)). |

**Interpretation checklist (don’t confuse code vs data):**

1. **`src/lib/colorPaletteCore.ts`** averages real pixels per cluster (centroids) and drops fringe purple/magenta in warm scenes — runs only when **`internalExtractAndStoreColors`** runs (upload, ingest paths, **Re-sample palettes** button).
2. Until you **`bun run deploy:convex`** and enqueue re-samples, **`images.colors` in Convex is old** → UI can still paint purple from stale rows.
3. Compare shell vs **`pindeck-754f`** for TMP-only features (aggregator filters, dummy gallery content), not Convex-backed palette accuracy.

**Compare:** Same shell (Pindeck sidebar, views, Tweaks/footer) vs **754f** richer filter chips/counts/topbar chrome; alignment with 754f is tracked in HANDOFF gaps.

### Production Pindeck on Vercel

The **main repo** frontend deploy URL is whichever project is linked in Vercel (GitHub integration). It is **not** pinned in this README because it varies by team/project slug — check the **Vercel dashboard** for repo `pindeck` or inspect `VERCEL_PROJECT_PRODUCTION_URL` after deploy.

## How to refresh

1. Run the frontend (`PORT=3000 bunx vite --host 127.0.0.1 --port 3000` or your usual script).
2. In Cursor → Simple Browser / IDE browser MCP: navigate, **Table** view, authenticate if needed.
3. `browser_take_screenshot` with filename under `docs/browser-snapshots/` (then copy out of MCP temp → this folder if the tool mirrors to `%TEMP%/cursor/screenshots/...`).
4. Optionally capture **`pindeck-754f`** again after TMP changes.
