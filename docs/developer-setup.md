# Developer setup

Environment and deployment reference moved from the project README. Actual values belong in git-ignored `.env.local` or deployment secrets; never commit credentials or backend and hosting URLs.

[Back to the project overview](../README.md)

## Local production workflow

Run the frontend against your configured Convex deployment (usually production credentials in `.env.local` only).

1. Install dependencies:

```bash
bun install
```

2. Configure env:

```bash
cp .env.example .env.local
```

Fill in Convex, media, and Trigger URLs in **`.env.local`**. See `.env.example` for variable names.

3. Example (values only in `.env.local`, not committed):

```bash
VITE_CONVEX_URL=
VITE_CONVEX_SITE_URL=
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

## Required Environment Variables

### Convex Dashboard (Backend)

Set in Convex Project Settings:

- `JWT_PRIVATE_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_VLM_MODEL` (optional)
- `OPENROUTER_PROVIDER_SORT` (optional)
- `FAL_KEY`
- `INGEST_API_KEY` (for Discord ingest)
- `ADMIN_USER_IDS` / `ADMIN_EMAILS` (optional comma-separated admin overrides for image delete/edit)
- `DISCORD_STATUS_WEBHOOK_URL` (optional Discord status updates)
- `MEDIA_GATEWAY_URL=` (RustFS media API base URL)
- `MEDIA_GATEWAY_TOKEN`
- `MEDIA_GATEWAY_BUCKET=pindeck`
- `MEDIA_GATEWAY_USER_ID=pindeck`
- `MEDIA_GATEWAY_UPLOAD_PREFIX=media-uploads`
- `PINDECK_STORAGE_PROVIDER=rustfs`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (optional; Google OAuth — backend-only until env + UI are enabled)
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` (optional; GitHub OAuth — backend-only until env + UI are enabled)
- `SITE_URL` (public app URL for OAuth redirect/callback; required if OAuth env is set)

### Local / Vercel Frontend

Set for frontend build/runtime:

- `VITE_CONVEX_URL=`
- `VITE_CONVEX_SITE_URL=`

Set in **`.env.local`** (git-ignored). See `.env.example`.

For Convex function deploys:

- `CONVEX_SELF_HOSTED_URL=`
- `PINDECK_CONVEX_SELF_HOSTED_ADMIN_KEY=<Pindeck self-hosted admin key>`
- `CONVEX_SELF_HOSTED_ADMIN_KEY=` is also accepted by the Convex CLI; prefer the Pindeck-prefixed name so it is not confused with other projects.
- Do **not** set `CONVEX_DEPLOYMENT` for Pindeck production.

Vercel production builds deploy Convex when `CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY` are configured. Preview builds without those deploy secrets run as frontend-only builds, so PR checks can still validate the UI without backend deploy credentials.

## Discord Bot (Ingest + Status)

The Discord bot and media gateway are hosted/deployed from a separate repo:

- Source of truth: separate **`discord-bot`** repository (not deployed from this tree)
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
# Run from your checkout of the discord-bot repository:
bun install
bun run dev
```

### Discord Bot Deployment

Notes:

- Manage the Discord bot and media gateway from the separate `discord-bot` repo.
- Keep hostnames, IP addresses, usernames, and SSH targets out of this repository.
- Pushing to `main` in the separate `discord-bot` repo can trigger its deploy workflow when the required GitHub Actions secrets are configured.

## Deploy

### Convex

```bash
bun run deploy:convex
```

This requires `.env.local` or the shell environment to include:

```bash
CONVEX_SELF_HOSTED_URL=
PINDECK_CONVEX_SELF_HOSTED_ADMIN_KEY=
```

Values from **`.env.local`** only.

Do **not** set `CONVEX_DEPLOYMENT`; the old Convex Cloud project has been deleted and Pindeck production uses the self-hosted Convex target above.
No Convex MCP is configured or required for production deploys; use the direct self-hosted Convex CLI target above.

For self-hosted Convex health checks and CLI patterns, see [`docs/self-hosted-convex-ops.md`](self-hosted-convex-ops.md).

### Vercel

Use the active Vercel project named **`pindeck`** for production deployment. Pushing to `main` on GitHub triggers the Vercel production deploy at `https://pindeck.dev`; Vercel runs `bun run build`, and the Bun-native `scripts/build.ts` wrapper runs `bunx convex deploy --cmd 'bun run build:frontend'` on production builds when the self-hosted Convex deploy secrets are present. Preview builds without those secrets skip Convex deploy and run the frontend build only.

**Vercel builds** use project env secrets for Convex deploy when configured. Locally, keep **`VITE_CONVEX_URL`**, **`VITE_CONVEX_SITE_URL`**, **`CONVEX_SELF_HOSTED_URL`**, and **`PINDECK_CONVEX_SELF_HOSTED_ADMIN_KEY`** in **`.env.local`** (see `.env.example`). Keep **`CONVEX_DEPLOYMENT` unset**.

Some scripts enforce that configured Convex URLs match the team’s production target; see `scripts/enforce-production-convex.sh`.

## Verification scripts

- `bun run e2e:smoke`: HTTP smoke against production Convex (ingest and orchestration authentication probes); optional `E2E_GENERATE=1` enables fal generation.
- `bun run e2e:ui`: Playwright app smoke; credentials use `E2E_EMAIL` and `E2E_PASSWORD` in git-ignored `.env.local`.

