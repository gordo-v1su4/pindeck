#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./convex-env.sh
source "${SCRIPT_DIR}/convex-env.sh"

has_convex_deploy_config() {
  [[ -n "${CONVEX_DEPLOY_KEY:-}" ]] ||
    ([[ -n "${CONVEX_SELF_HOSTED_URL:-}" ]] && [[ -n "${CONVEX_SELF_HOSTED_ADMIN_KEY:-}" ]])
}

if [[ "${VERCEL:-}" == "1" ]] && has_convex_deploy_config; then
  bun run check:prod-target
  bunx convex deploy --cmd 'bun run build:frontend'
elif [[ "${VERCEL:-}" == "1" ]]; then
  if [[ "${VERCEL_ENV:-}" == "production" ]]; then
    echo "ERROR: production Vercel build is missing Convex deployment configuration." >&2
    exit 1
  fi
  echo "Preview build: Convex deployment configuration is not present; building frontend only."
  bun run build:frontend
else
  bun run build:frontend
fi
