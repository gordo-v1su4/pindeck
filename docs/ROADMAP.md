# Pindeck Roadmap

## Later

### Pinterest-style infinite scroll gallery (research + plan; not started)
Goal: fast, smooth gallery for a large library (React 19 + Vite on Vercel, Convex backend).
- Virtualized masonry grid that places each tile in the shortest column (candidates: Masonic, react-virtuoso, TanStack Virtual). Requires stored width/height per image.
- Paginated fetching with Convex `usePaginatedQuery` plus a sentinel element; load 30-50 images per page.
- Lazy loading via native `loading="lazy"` or IntersectionObserver 1-2 screens ahead; `fetchpriority="high"` on the first visible row.
- Blur-up placeholders: BlurHash/ThumbHash, or the dominant color the color analyzer already provides.
- `srcset`/`sizes` using the three existing WebP sizes (gallery uses medium, never the original or the smallest).
- Stable image URLs with long `Cache-Control: public, max-age=31536000, immutable`; avoid signed URLs that change per visit.
- Keep the gallery mounted (or its data/layout in memory) when switching views, so returning is instant.
