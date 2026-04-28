# Pindeck (Production-First)

AI-powered image gallery + generation app using React, Convex, OpenRouter, and fal.ai.

## Production Local Workflow (No Dev Server)

This repo is configured to run locally against your **production Convex deployment**.

1. Install dependencies:
```bash
bun install
```

2. Configure env:
```bash
cp .env.example .env.local
```

3. Set production Convex URL in `.env.local`:
```bash
VITE_CONVEX_URL=https://tremendous-jaguar-953.convex.cloud
```

4. Build production bundle:
```bash
bun run build
```

5. Serve production bundle:
```bash
bun run serve
```

`bun run serve` always uses port `4173` and will kill any process already using that port before starting.

## Current Production Deployments

- Convex production deployment: `tremendous-jaguar-953`
- Convex client URL: `https://tremendous-jaguar-953.convex.cloud`
- Convex HTTP/actions URL: `https://tremendous-jaguar-953.convex.site`
- Discord bot + media gateway deployment source: separate repo `~/Documents/Github/discord-bot`

## Required Environment Variables

### Convex Dashboard (Backend)

Set in Convex Project Settings:
- `JWT_PRIVATE_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_VLM_MODEL` (optional)
- `OPENROUTER_PROVIDER_SORT` (optional)
- `FAL_KEY`
- `INGEST_API_KEY` (for Discord ingest)
- `DISCORD_STATUS_WEBHOOK_URL` (optional Discord status updates)
- `NEXTCLOUD_WEBDAV_BASE_URL`
- `NEXTCLOUD_WEBDAV_USER`
- `NEXTCLOUD_WEBDAV_APP_PASSWORD`
- `NEXTCLOUD_UPLOAD_PREFIX` (default: `pindeck/media-uploads`)
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (for Google OAuth)
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` (for GitHub OAuth)
- `SITE_URL` (public app URL for OAuth redirect/callback)

### Local / Vercel Frontend

Set for frontend build/runtime:
- `VITE_CONVEX_URL=https://tremendous-jaguar-953.convex.cloud`

Optional (if needed by tooling/integrations):
- `VITE_CONVEX_SITE_URL=https://tremendous-jaguar-953.convex.site`

## Scripts

- `bun run check:prod-target` - Verify local env is pinned to `tremendous-jaguar-953`
- `bun run build` - Production build (`vite build`)
- `bun run serve` - Production preview on `4173` (auto-kills existing `4173` listener first)
- `bun run deploy:convex` - Deploy Convex functions

## Media Upload Pipeline (Convex -> Nextcloud)

- Uploads first land in Convex storage, then `convex/mediaStorage.finalizeUploadedImage` persists to Nextcloud.
- Nextcloud target path format is:
  - `pindeck/media-uploads/YYYY/MM_DD/original/<file>`
  - `pindeck/media-uploads/YYYY/MM_DD/preview/<file>-preview.<ext>`
  - `pindeck/media-uploads/YYYY/MM_DD/low/<file>-w320.webp`
  - `pindeck/media-uploads/YYYY/MM_DD/high/<file>-w768.webp` (+ `w1280`)
- Directory creation is explicit via WebDAV `MKCOL` before `PUT`.

### Image record tracking fields

Each image now carries persistence status for observability:
- `nextcloudPersistStatus`: `pending` | `succeeded` | `failed`
- `nextcloudPersistError`: error message when persist failed
- `derivativeUrls`: `{ small, medium, large }` (when available)
- `derivativeStoragePaths`: `{ small, medium, large }` (when available)

### Nextcloud public delivery

Pindeck now supports two ways to turn stored Nextcloud files into browser-safe URLs:

1. Preferred: share the upload root folder once in Nextcloud and set:
   - `NEXTCLOUD_PUBLIC_SHARE_TOKEN`
   - `NEXTCLOUD_UPLOAD_SHARE_TOKEN` (optional but recommended: separate write-enabled token for backend uploads)
   - `NEXTCLOUD_PUBLIC_SHARE_PATH` (optional, defaults to `NEXTCLOUD_UPLOAD_PREFIX`)
   - `NEXTCLOUD_PUBLIC_BASE_URL` (optional, defaults to the Nextcloud server base URL)
2. Alternate: create per-file public shares through the Nextcloud OCS API.

The shared-folder model is the closest match to "Nextcloud as a bucket":
- Convex still uploads originals/previews/derivatives through WebDAV.
- Public image URLs are derived from the shared root folder token using
  `public.php/dav/files/<token>/...` paths.
- Gallery, boards, deck, and table all continue to read the same `images.imageUrl` / `previewUrl` fields.

### Backfill Convex-only uploads

Use the mutation below to reschedule persistence for uploads still in Convex storage:

```bash
bunx convex run images:backfillNextcloudFailedUploads '{"limit":50}'
```

The mutation targets authenticated user uploads where:
- `sourceType = "upload"`
- `storageProvider = "convex"`
- `storageId` is still present

## Discord Bot (Ingest + Status)

The Discord bot and media gateway are hosted/deployed from a separate repo:

- Source of truth: `~/Documents/Github/discord-bot`
- This `pindeck` repo consumes those services via:
  - Convex HTTP actions (`/ingestExternal`, `/discordQueue`, `/discordModerate`)
  - Media gateway endpoint/env wiring (`MEDIA_GATEWAY_URL`, token-based auth)

Typical setup in `.env.local`:
- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID`
- `DISCORD_INGEST_EMOJIS` (example: `:pushpin:` equivalent unicode/custom emoji format)
- `INGEST_API_KEY`
- `NEXTCLOUD_PUBLIC_SHARE_TOKEN` (recommended when Nextcloud is used as the public asset host)
- `NEXTCLOUD_UPLOAD_SHARE_TOKEN` (recommended hidden upload token when using a separate write-enabled share)
- `NEXTCLOUD_PUBLIC_SHARE_PATH` (optional override for the shared root)
- `NEXTCLOUD_PUBLIC_BASE_URL` (optional override when Nextcloud is behind a public proxy)
- `PINDECK_INGEST_URL` (optional if deriving from Convex site URL)
- `PINDECK_DISCORD_QUEUE_URL` / `PINDECK_DISCORD_MODERATION_URL` (optional overrides)

Run:
```bash
# Run from the separate discord-bot repository:
cd ~/Documents/Github/discord-bot
bun install
bun run dev
```

### Hostinger SSH

The Discord bot and media gateway are hosted on the Hostinger machine below and should be managed from the separate `discord-bot` repo:

- Hostname: `srv1353991`
- Public IP: `187.77.8.227`
- Tailscale IP: `100.105.199.93`
- User: `root`

Connect with:

```bash
ssh root@187.77.8.227
```

Notes:
- The preferred deploy path is direct SSH over the public IP, including GitHub Actions.
- Tailscale SSH remains a fallback operator path if public access is unavailable.
- The deployment repo on that host is `/root/discord-bot`.
- Pushing to `main` in the separate `discord-bot` repo can trigger the Hostinger deploy workflow when `HOSTINGER_SSH_KEY` is configured in GitHub Actions.

## Deploy

### Convex

```bash
bun run deploy:convex
```

### Vercel

Use Vercel for frontend deployment. Pushing to `main` on GitHub triggers the Vercel frontend deploy.

**Vercel builds** do not use `.env.local`. The check script and **`vite.config.ts`** **default** `VITE_CONVEX_URL` / `VITE_CONVEX_SITE_URL` to **`tremendous-jaguar-953`** when unset, so previews deploy without extra env. Override in **Settings → Environment Variables** if you intentionally point previews at another Convex deployment.

Locally, keep **`CONVEX_DEPLOYMENT`**, **`VITE_CONVEX_URL`**, and **`VITE_CONVEX_SITE_URL`** in **`.env.local`** so `dev` / `deploy:convex` match production (see `.env.example`).

## Unified UI / design tokens (Tweaks)

- Tweaks persisted in `localStorage` (`pindeck_tweaks`) drive **`applyPindeckTweaksToDocument`** in [`src/lib/pdTheme.ts`](src/lib/pdTheme.ts): `--pd-accent`, derived `--pd-accent-ink`, `--pd-accent-soft`, `--pd-accent-hover`, `--pd-accent-contrast-text`, plus TMP-compatible `--accent*` aliases on `document.documentElement`.
- The static prototype reference lives under [`TMP/`](TMP/) (see [`TMP/HANDOFF.md`](TMP/HANDOFF.md)); larger deck deltas vs [`claude/redesign`](branch) are summarized in [`docs/guides/redesign-deck-port-inventory.md`](docs/guides/redesign-deck-port-inventory.md).
- Sign-in ([`src/SignInForm.tsx`](src/SignInForm.tsx)) uses the same CSS variables so primary actions match the Tweaks accent (aligned with [`claude/redesign`](branch) semantics).

**Gotcha:** Do not re-declare `--pd-accent`, `--pd-accent-ink`, `--pd-accent-soft`, `--pd-font-*`, etc. on `.pd-theme` — they would override `document.documentElement` and break Tweaks until you move those variables to `:root` defaults only (see [`src/index.css`](src/index.css)).

## Notes

- **pd Gallery tiles** ([`src/components/pd/GalleryView.tsx`](src/components/pd/GalleryView.tsx)): image-first cards with a **VAR** badge for generated children; **heart** + **bookmark** are **top-right only** (no second like indicator). Like uses optimistic UI; filled **red** heart / **blue** filled bookmark when the image is on a board. Variation generation stays in the image drawer, not on the tile overlay.
- **Create New Board** (bookmark → Create board, [`src/components/CreateBoardModal.tsx`](src/components/CreateBoardModal.tsx)): **`Dialog`** with **`.pd-theme`** + same field chrome as the image drawer (`var(--pd-line-strong)`, `--pd-accent` primary); **`boards.create`** args remain **name**, **description**, **isPublic**. Image **variation** generation stays on **`vision.generateVariations`** in the drawer (`ImageDetailDrawer`), not this modal.
- **Decks** ([`src/components/DeckView.tsx`](src/components/DeckView.tsx), [`src/components/deck/`](src/components/deck/)): Matches **`claude/redesign`** — sideways deck library strip, **`DeckComposer`** + **`DeckCanvasPage`**. **`convex/decks.list`** returns **`stripImageUrls`** + **`stripPalettes`** (**`images.colors[..5]`** per slide, same metadata as the **Table** `PinSwatches` column). Library cards use a **16:9 hero** still for the first slide and a **filmstrip** row for extras, each with **`PinSwatches`**. **Tweaks** **`--pd-accent*`** apply to **composer chrome**; composer **left swatches** client-sample the **active** strip image (Convex fallback by **`imageUrl`**). **`DeckCanvasPage`** slide frames have **no selection outline**; **editable-text** focus uses **`colors.accent`**. Deck **color state** is not persisted in **`localStorage`**. Deploy **`bun run deploy:convex`** after **`decks.list`** changes.
- **Image palette / swatches:** Stored `colors` are **average RGB per quantized cluster** (not lattice corners), Lab-space dedup + warm‑scene magenta/purple suppression (`src/lib/colorPaletteCore.ts`). Server prefers **`imageUrl`** (`convex/colorExtractionUrls.ts`). After changing extraction logic deploy Convex, then Table **“Re-sample palettes”** → wait for scheduled actions → reload.
- **Cinematic metadata (TYPE / Genre / Shot / Style):** VLM analysis (`convex/vision.ts`) writes `group`, `genre`, `shot`, and `style` on `images`. Table **“Backfill metadata”** schedules re-analysis for **your** uploads (staggered). Sidebar filter chips use `libraryAggregations` + shared client filters (`src/lib/libraryFilters.ts`).
- Do not use `convex dev` when targeting production.
- Vercel does not host the Discord websocket worker; run bot separately (always-on worker/container).
- Do not treat `services/discord-bot` in this repo as deployment source; use `~/Documents/Github/discord-bot`.
- `dev`, `build`, `serve`, `lint`, and `deploy:convex` enforce production Convex targets (`tremendous-jaguar-953`) and fail fast otherwise.
