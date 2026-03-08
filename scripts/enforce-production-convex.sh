#!/usr/bin/env bash
set -euo pipefail

EXPECTED_DEPLOYMENT="tremendous-jaguar-953"
EXPECTED_CLOUD_URL="https://tremendous-jaguar-953.convex.cloud"
EXPECTED_SITE_URL="https://tremendous-jaguar-953.convex.site"

env_file=".env.local"
if [[ -f "$env_file" ]]; then
  # shellcheck disable=SC1090
  source "$env_file"
fi

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

[[ "${CONVEX_DEPLOYMENT:-}" == "$EXPECTED_DEPLOYMENT" ]] || fail "CONVEX_DEPLOYMENT must be '$EXPECTED_DEPLOYMENT'."
[[ "${VITE_CONVEX_URL:-}" == "$EXPECTED_CLOUD_URL" ]] || fail "VITE_CONVEX_URL must be '$EXPECTED_CLOUD_URL'."
[[ "${VITE_CONVEX_SITE_URL:-}" == "$EXPECTED_SITE_URL" ]] || fail "VITE_CONVEX_SITE_URL must be '$EXPECTED_SITE_URL'."

echo "Convex target check passed: production ($EXPECTED_DEPLOYMENT)"
