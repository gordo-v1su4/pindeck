#!/usr/bin/env bash
set -euo pipefail

EXPECTED_CLOUD_URL="https://convex.serving.cloud"
EXPECTED_SITE_URL="https://convex-site.serving.cloud"
EXPECTED_SELF_HOSTED_URL="https://convex.serving.cloud"
# Unfold / Review Room stack on the same VPS — not Pindeck (see convex-deployments.mdc).
FORBIDDEN_HOST_PATTERN="unfold.serving.cloud"

load_env_value() {
  local key="$1"
  local env_file="$2"
  local line
  line="$(tr -d '\r' < "$env_file" | grep -m1 "^${key}=" || true)"
  [[ -n "$line" ]] || return 0
  printf -v "$key" '%s' "${line#*=}"
  export "$key"
}

env_file=".env"
if [[ -f "$env_file" ]]; then
  # Read only deployment keys without evaluating secret values as shell.
  for key in VITE_CONVEX_URL VITE_CONVEX_SITE_URL CONVEX_SELF_HOSTED_URL CONVEX_SELF_HOSTED_ADMIN_KEY PINDECK_CONVEX_SELF_HOSTED_ADMIN_KEY CONVEX_DEPLOYMENT; do
    [[ -n "${!key:-}" ]] || load_env_value "$key" "$env_file"
  done
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./convex-env.sh
source "${SCRIPT_DIR}/convex-env.sh"

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

vite_urls_match() {
  [[ "${VITE_CONVEX_URL:-}" == "$EXPECTED_CLOUD_URL" ]] || return 1
  [[ "${VITE_CONVEX_SITE_URL:-}" == "$EXPECTED_SITE_URL" ]] || return 1
  return 0
}

self_hosted_target_present() {
  [[ "${CONVEX_SELF_HOSTED_URL:-}" == "$EXPECTED_SELF_HOSTED_URL" ]] || return 1
  [[ -n "${CONVEX_SELF_HOSTED_ADMIN_KEY:-}" ]] || return 1
  return 0
}

reject_unfold_targets() {
  local var value
  for var in CONVEX_SELF_HOSTED_URL VITE_CONVEX_URL VITE_CONVEX_SITE_URL; do
    value="${!var:-}"
    [[ "$value" != *"$FORBIDDEN_HOST_PATTERN"* ]] || fail "${var} points at Unfold/Review Room ($value). Pindeck uses convex.serving.cloud only (Docker project pindeck-convex, containers pindeck-convex-backend-1)."
  done
}

# Frontend builds need public configuration only. Backend deployment checks stay
# strict in every environment, including CI, and require self-hosted credentials.
if [[ "${1:-}" == "--frontend" ]]; then
  vite_urls_match || fail "Frontend VITE_CONVEX_URL and VITE_CONVEX_SITE_URL must explicitly match the configured Pindeck target."
  echo "Convex target check passed: frontend public configuration"
  exit 0
fi

[[ -z "${CONVEX_DEPLOYMENT:-}" ]] || fail "CONVEX_DEPLOYMENT must be unset when targeting self-hosted Convex."
reject_unfold_targets
self_hosted_target_present || fail "CONVEX_SELF_HOSTED_URL must be '$EXPECTED_SELF_HOSTED_URL' and CONVEX_SELF_HOSTED_ADMIN_KEY or PINDECK_CONVEX_SELF_HOSTED_ADMIN_KEY must be set (Pindeck admin key for pindeck-convex stack, not review-room-convex)."
vite_urls_match || fail "VITE_CONVEX_URL must be '$EXPECTED_CLOUD_URL' and VITE_CONVEX_SITE_URL must be '$EXPECTED_SITE_URL'."

echo "Convex target check passed: Pindeck self-hosted ($EXPECTED_SELF_HOSTED_URL) — not Unfold"
