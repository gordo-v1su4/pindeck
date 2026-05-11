# Pindeck (Production-First)

AI-powered image gallery + generation app using React, Convex, OpenRouter, and fal.ai.

## Production Local Workflow (No Dev Server)

This repo is configured to run locally against the **self-hosted production Convex deployment**.

1. Install dependencies:
```bash
bun install
```

2. Configure env:
```bash
cp .env.example .env.local
```

3. Set self-hosted production Convex URLs in `.env.local`:
```bash
VITE_CONVEX_URL=https://convex.serving.cloud
VITE_CONVEX_SITE_URL=https://convex-site.serving.cloud
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

- Convex production deployment: **self-hosted only**
- Convex client URL: `https://convex.serving.cloud`
- Convex HTTP/actions URL: `https://convex-site.serving.cloud`
- Legacy Convex Cloud deployments have been removed/deleted and must not be used for deploys or frontend env.
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
- `MEDIA_GATEWAY_URL=https://media.v1su4.dev`
- `MEDIA_GATEWAY_TOKEN`
- `MEDIA_GATEWAY_BUCKET=pindeck`
- `MEDIA_GATEWAY_USER_ID=pindeck`
- `MEDIA_GATEWAY_UPLOAD_PREFIX=media-uploads`
- `PINDECK_STORAGE_PROVIDER=rustfs`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (for Google OAuth)
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` (for GitHub OAuth)
- `SITE_URL` (public app URL for OAuth redirect/callback)

### Local / Vercel Frontend

Set for frontend build/runtime:
- `VITE_CONVEX_URL=https://convex.serving.cloud`
- `VITE_CONVEX_SITE_URL=https://convex-site.serving.cloud`

For Convex function deploys:
- `CONVEX_SELF_HOSTED_URL=https://convex.serving.cloud`
- `CONVEX_SELF_HOSTED_ADMIN_KEY=<self-hosted admin key>`
- Do **not** set `CONVEX_DEPLOYMENT` for Pindeck production.

## Scripts

- `bun run check:prod-target` - Verify local env is pinned to self-hosted production Convex
- `bun run build` - Production build (`vite build`)
- `bun run serve` - Production preview on `4173` (auto-kills existing `4173` listener first)
- `bun run deploy:convex` - Deploy Convex functions

## Media Upload Pipeline (Convex -> RustFS)

- Uploads first land in Convex storage, then `convex/mediaStorage.finalizeUploadedImage` persists to the RustFS media API.
- Durable assets live in the `pindeck` bucket and read publicly from `https://s3.v1su4.dev/pindeck/...`.
- RustFS object key format is:
  - `media-uploads/YYYY/MM_DD/original/<file>`
  - `media-uploads/YYYY/MM_DD/preview/<file>-preview.<ext>`
  - `media-uploads/YYYY/MM_DD/low/<file>-w320.<ext>`
  - `media-uploads/YYYY/MM_DD/high/<file>-w1280.<ext>` / `w1920.<ext>`
- Convex and Vercel never receive direct S3 credentials; all writes and deletes go through `MEDIA_GATEWAY_URL`.

### Image record tracking fields

Each image now carries persistence status for observability:
- `storageProvider`: `convex` | `rustfs`
- `storageBucket`: bucket name for RustFS-backed assets
- `storagePersistStatus`: `pending` | `succeeded` | `failed`
- `storagePersistError`: generic storage error when persist failed
- `derivativeUrls`: `{ small, medium, large }` (when available)
- `derivativeStoragePaths`: `{ small, medium, large }` (when available)

Gallery, boards, deck, and table all continue to read the same `images.imageUrl` / `previewUrl` fields; those URLs should resolve to RustFS-backed public objects.

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
- `MEDIA_GATEWAY_URL` / `RUSTFS_MEDIA_API_URL` (RustFS-backed media API)
- `MEDIA_GATEWAY_TOKEN` / `MEDIA_API_TOKEN`
- `MEDIA_GATEWAY_BUCKET=pindeck`
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

This requires `.env.local` or the shell environment to include:

```bash
CONVEX_SELF_HOSTED_URL=https://convex.serving.cloud
CONVEX_SELF_HOSTED_ADMIN_KEY=...
```

Do **not** set `CONVEX_DEPLOYMENT`; the old Convex Cloud project has been deleted and Pindeck production uses the self-hosted Convex target above.
No Convex MCP is configured or required for production deploys; use the direct self-hosted Convex CLI target above.

### Vercel

Use Vercel for frontend deployment. Pushing to `main` on GitHub triggers the Vercel frontend deploy.

**Vercel builds** do not use `.env.local`. The check script and **`vite.config.ts`** **default** `VITE_CONVEX_URL` to **`https://convex.serving.cloud`** when unset, so previews deploy without extra env. Set `VITE_CONVEX_SITE_URL=https://convex-site.serving.cloud` when code needs the HTTP/actions URL.

Locally, keep **`VITE_CONVEX_URL`**, **`VITE_CONVEX_SITE_URL`**, **`CONVEX_SELF_HOSTED_URL`**, and **`CONVEX_SELF_HOSTED_ADMIN_KEY`** in **`.env.local`** so `dev` / `deploy:convex` match production (see `.env.example`). Keep **`CONVEX_DEPLOYMENT` unset**.

## Unified UI / design tokens (Tweaks)

- Tweaks persisted in `localStorage` (`pindeck_tweaks`) drive **`applyPindeckTweaksToDocument`** in [`src/lib/pdTheme.ts`](src/lib/pdTheme.ts): `--pd-accent`, derived `--pd-accent-ink`, `--pd-accent-soft`, `--pd-accent-hover`, `--pd-accent-contrast-text`, plus TMP-compatible `--accent*` aliases on `document.documentElement`.
- The static prototype reference lives under [`TMP/`](TMP/) (see [`TMP/HANDOFF.md`](TMP/HANDOFF.md)); larger deck deltas vs [`claude/redesign`](branch) are summarized in [`docs/guides/redesign-deck-port-inventory.md`](docs/guides/redesign-deck-port-inventory.md).
- Sign-in ([`src/SignInForm.tsx`](src/SignInForm.tsx)) uses the same CSS variables so primary actions match the Tweaks accent (aligned with [`claude/redesign`](branch) semantics).

**Gotcha:** Do not re-declare `--pd-accent`, `--pd-accent-ink`, `--pd-accent-soft`, `--pd-font-*`, etc. on `.pd-theme` — they would override `document.documentElement` and break Tweaks until you move those variables to `:root` defaults only (see [`src/index.css`](src/index.css)).

## Notes

- **pd Gallery tiles** ([`src/components/pd/GalleryView.tsx`](src/components/pd/GalleryView.tsx)): image-first cards with a **VAR** badge for generated children; **heart** + **bookmark** are **top-right only** (no second like indicator). Like uses optimistic UI; filled **red** heart / **blue** filled bookmark when the image is on a board. Variation generation stays in the image drawer, not on the tile overlay.
- **Create New Board** (bookmark → Create board, [`src/components/CreateBoardModal.tsx`](src/components/CreateBoardModal.tsx)): **`Dialog`** with **`.pd-theme`** + same field chrome as the image drawer (`var(--pd-line-strong)`, `--pd-accent` primary); **`boards.create`** args remain **name**, **description**, **isPublic**. Image **variation** generation stays on **`vision.generateVariations`** in the drawer (`ImageDetailDrawer`), not this modal.
- **Decks** ([`src/components/DeckView.tsx`](src/components/DeckView.tsx), [`src/components/deck/`](src/components/deck/)): Matches **`claude/redesign`** — sideways deck library strip, **`DeckComposer`** + **`DeckCanvasPage`**. **`convex/decks.list`** returns **`stripImageUrls`** + **`stripPalettes`** (**`images.colors[..5]`** per slide, same metadata as the **Table** `PinSwatches` column). Library cards use a **16:9 hero** still for the first slide and a **filmstrip** row for extras, each with **`PinSwatches`**. **Tweaks** **`--pd-accent*`** apply to **composer chrome**; composer **left swatches** client-sample the **active** strip image (Convex fallback by **`imageUrl`**). **`DeckCanvasPage`** slide frames have **no selection outline**; **editable-text** focus uses **`colors.accent`**. Deck **color state** is not persisted in **`localStorage`**. Deploy self-hosted Convex after **`decks.list`** changes.
- **Image palette / swatches:** Stored `colors` are **average RGB per quantized cluster** (not lattice corners), Lab-space dedup + warm-scene magenta/purple suppression (`src/lib/colorPaletteCore.ts`). Server prefers **`imageUrl`** (`convex/colorExtractionUrls.ts`). After changing extraction logic deploy self-hosted Convex, then Table **“Refresh metadata”** / **“Refresh selected”** → wait for scheduled actions → reload.
- **Cinematic metadata (TYPE / Genre / Shot / Style):** VLM analysis (`convex/vision.ts`) writes `group`, `genre`, `shot`, and `style` on `images`. Table **“Refresh metadata”** schedules metadata and color refresh for **your** uploads; when rows are selected, **“Refresh selected”** only schedules the selected images. Sidebar filter chips use `libraryAggregations` + shared client filters (`src/lib/libraryFilters.ts`).
- Do not use `convex dev` when targeting production.
- Vercel does not host the Discord websocket worker; run bot separately (always-on worker/container).
- Do not treat `services/discord-bot` in this repo as deployment source; use `~/Documents/Github/discord-bot`.
- `dev`, `build`, `serve`, `lint`, and `deploy:convex` enforce self-hosted production Convex targets (`https://convex.serving.cloud`) and fail fast otherwise.
