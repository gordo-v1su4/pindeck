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

vite_urls_match() {
  [[ "${VITE_CONVEX_URL:-}" == "$EXPECTED_CLOUD_URL" ]] || return 1
  [[ "${VITE_CONVEX_SITE_URL:-}" == "$EXPECTED_SITE_URL" ]] || return 1
  return 0
}

# Vercel/GitHub Actions do not have .env.local. The client bundle only needs
# VITE_CONVEX_* at build time — CONVEX_DEPLOYMENT is for local Convex CLI discipline.
is_ci_build() {
  [[ "${VERCEL:-}" == "1" ]] ||
    [[ "${CI:-}" == "true" ]] ||
    [[ "${CI:-}" == "1" ]] ||
    [[ "${GITHUB_ACTIONS:-}" == "true" ]]
}

if is_ci_build; then
  # Default empty env to production Convex (same fallback as vite.config.ts) so CI
  # succeeds without Dashboard secrets; explicit wrong URLs still fail fast.
  v_url="${VITE_CONVEX_URL:-$EXPECTED_CLOUD_URL}"
  v_site="${VITE_CONVEX_SITE_URL:-$EXPECTED_SITE_URL}"
  [[ "$v_url" == "$EXPECTED_CLOUD_URL" ]] || fail "CI VITE_CONVEX_URL must be '$EXPECTED_CLOUD_URL' (got '${VITE_CONVEX_URL:-}'. Clear or fix Vercel env)."
  [[ "$v_site" == "$EXPECTED_SITE_URL" ]] || fail "CI VITE_CONVEX_SITE_URL must be '$EXPECTED_SITE_URL' (got '${VITE_CONVEX_SITE_URL:-}'. Clear or fix Vercel env)."
  echo "Convex target check passed: production VITE_* (CI — defaulted if unset)"
  exit 0
fi

[[ "${CONVEX_DEPLOYMENT:-}" == "$EXPECTED_DEPLOYMENT" ]] || fail "CONVEX_DEPLOYMENT must be '$EXPECTED_DEPLOYMENT'."
vite_urls_match || fail "VITE_CONVEX_URL must be '$EXPECTED_CLOUD_URL' and VITE_CONVEX_SITE_URL must be '$EXPECTED_SITE_URL'."

echo "Convex target check passed: production ($EXPECTED_DEPLOYMENT)"
