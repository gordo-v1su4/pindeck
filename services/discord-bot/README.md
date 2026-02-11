# Discord Image Bot

Supports two workflows:
- Presets posted in Discord channels via:
- `/images menu` (recommended)
- `/images send`
- `/images panel` + emoji reactions (fallback)
- Ingest existing Discord posts into Pindeck via:
  - `/images import` (optional `message_link`)
  - Custom emoji reaction trigger on any message with images
- RSS-forwarded messages are parsed for title/description/source URL and `sref`
- Linked `x.com/twitter.com/fxtwitter.com` posts are also parsed to collect direct media URLs when available

## Environment
Set these in `/Users/robertspaniolo/Documents/Github/pindeck/.env.local`:

- `DISCORD_TOKEN` - Bot token from Discord Developer Portal
- `DISCORD_CLIENT_ID` - Application ID from Discord Developer Portal (recommended; auto-derived from token if omitted)
- `DISCORD_GUILD_ID` - Optional but recommended for fast slash command updates
- `DISCORD_IMAGES_JSON` - JSON array of image presets
- `DISCORD_INGEST_EMOJIS` - Comma-separated emoji triggers for import (unicode or custom, e.g. `📥,<:pindeck:123456789012345678>`)
- `INGEST_API_KEY` - Must match Convex `INGEST_API_KEY`
- `PINDECK_INGEST_URL` - Optional; defaults to `<CONVEX_SITE_URL>/ingestExternal`
- `PINDECK_USER_ID` - Convex user id destination for imports (required for ingest endpoint)

If `DISCORD_IMAGES_JSON` is missing, bot uses placeholder sample images.

### Target User
- Set `PINDECK_USER_ID` so Discord imports are written to the correct Pindeck account.

Example:

```json
[
  {
    "id": "welcome-banner",
    "label": "Welcome Banner",
    "url": "https://example.com/welcome.png",
    "emoji": "🎉"
  },
  {
    "id": "rules-card",
    "label": "Rules Card",
    "url": "https://example.com/rules.png",
    "emoji": "📌"
  }
]
```

## Bot Invite Setup
Use OAuth2 URL Generator in the Discord Developer Portal:

- Scopes:
  - `bot`
  - `applications.commands`
- Bot permissions:
  - `View Channels`
  - `Send Messages`
  - `Embed Links`
  - `Read Message History`
  - `Add Reactions`
  - `Use Application Commands`

To allow posting in any channel, ensure the bot role is allowed in each channel/category override.

## Install

```bash
bun install --cwd services/discord-bot
```

## Run

Start bot:

```bash
bash /Users/robertspaniolo/Documents/Github/pindeck/scripts/run-discord-bot.sh
```

Register commands only (dry-run):

```bash
cd /Users/robertspaniolo/Documents/Github/pindeck/services/discord-bot
DISCORD_DRY_RUN=1 bun src/index.js
```

## Test Checklist
1. Run `/images menu` in a channel and select a preset.
2. Run `/images send preset:<name>` and confirm image posts.
3. Run `/images panel`, click a listed emoji reaction, confirm image posts.
4. Run `/images import` and confirm it imports the latest image post to Pindeck.
5. React to an earlier image post with one of `DISCORD_INGEST_EMOJIS` and confirm import to Pindeck.
6. Try a channel where bot lacks permission and confirm the bot returns a missing-permission message.

## RSS + sref Parsing
- On ingest, the bot parses message content + embeds to extract:
  - Post title
  - Post description/body
  - Source link (non-image URL or embed URL)
  - `sref` number (patterns like `sref 12345`, `sref:12345`, `#sref12345`)
- Parsed `sref` is sent to Pindeck `sref` field and also added to tags as `sref:<number>`.
- By default the bot also fetches linked post HTML to find more image URLs (`DISCORD_INGEST_FETCH_EXTERNAL=1`).
