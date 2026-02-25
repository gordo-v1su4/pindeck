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

### Local / Vercel Frontend

Set for frontend build/runtime:
- `VITE_CONVEX_URL=https://tremendous-jaguar-953.convex.cloud`

Optional (if needed by tooling/integrations):
- `VITE_CONVEX_SITE_URL=https://tremendous-jaguar-953.convex.site`

## Scripts

- `bun run build` - Production build (`vite build`)
- `bun run serve` - Production preview on `4173` (auto-kills existing `4173` listener first)
- `bun run deploy:convex` - Deploy Convex functions
- `bun run discord:bot` - Run Discord bot process
- `bun run discord:bot:dry-run` - Register Discord commands and exit

## Discord Bot (Ingest + Status)

Bot service location: `services/discord-bot`

Typical setup in `.env.local`:
- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID`
- `DISCORD_INGEST_EMOJIS` (example: `:pushpin:` equivalent unicode/custom emoji format)
- `INGEST_API_KEY`
- `PINDECK_INGEST_URL` (optional if deriving from Convex site URL)
- `PINDECK_DISCORD_QUEUE_URL` / `PINDECK_DISCORD_MODERATION_URL` (optional overrides)

Run:
```bash
bun install --cwd services/discord-bot
bun run discord:bot
```

## Deploy

### Convex

```bash
bun run deploy:convex
```

### Vercel

Use Vercel for frontend deployment. Ensure `VITE_CONVEX_URL` points to production Convex (`.convex.cloud`).

## Notes

- Do not use `convex dev` when targeting production.
- Vercel does not host the Discord websocket worker; run bot separately (always-on worker/container).
