#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BOT_DIR="${ROOT_DIR}/services/discord-bot"

if [ -f "${ROOT_DIR}/.env.local" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ROOT_DIR}/.env.local"
  set +a
fi

if [ -z "${DISCORD_TOKEN:-}" ] && [ -n "${DISCORD_BOT_TOKEN:-}" ]; then
  export DISCORD_TOKEN="${DISCORD_BOT_TOKEN}"
fi

if [ -z "${DISCORD_TOKEN:-}" ]; then
  echo "DISCORD_TOKEN is not set. Add it to .env.local before starting the Discord bot." >&2
  exit 1
fi

if [ -z "${DISCORD_CLIENT_ID:-}" ] && [ -n "${DISCORD_APPLICATION_ID:-}" ]; then
  export DISCORD_CLIENT_ID="${DISCORD_APPLICATION_ID}"
fi

if [ ! -d "${BOT_DIR}/node_modules/discord.js" ]; then
  echo "discord.js is not installed for services/discord-bot." >&2
  echo "Run: bun install --cwd services/discord-bot" >&2
  exit 1
fi

cd "${BOT_DIR}"
exec bun src/index.js "$@"
