#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

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
  echo "DISCORD_TOKEN is not set. Add it to .env.local before starting Discord MCP." >&2
  exit 1
fi

exec npx -y @chinchillaenterprises/mcp-discord "$@"
