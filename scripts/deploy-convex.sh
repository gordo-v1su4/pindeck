#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./convex-env.sh
source "${SCRIPT_DIR}/convex-env.sh"

# Loads Pindeck targets from repo .env via check:prod-target (never source .env.local
# as shell — JWT lines break zsh). Deploys to pindeck-convex on Hostinger only.
bun run check:prod-target
bunx convex deploy
