#!/usr/bin/env bash
set -euo pipefail

EXPECTED_CLOUD_URL="https://convex.serving.cloud"
EXPECTED_SITE_URL="https://convex-site.serving.cloud"
EXPECTED_SELF_HOSTED_URL="https://convex.serving.cloud"

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

self_hosted_target_present() {
  [[ "${CONVEX_SELF_HOSTED_URL:-}" == "$EXPECTED_SELF_HOSTED_URL" ]] || return 1
  [[ -n "${CONVEX_SELF_HOSTED_ADMIN_KEY:-}" ]] || return 1
  return 0
}

# Vercel/GitHub Actions do not have .env.local. The client bundle only needs
# VITE_CONVEX_* at build time. Pindeck production is self-hosted, so
# CONVEX_DEPLOYMENT must remain unset; deploy with CONVEX_SELF_HOSTED_*.
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

[[ -z "${CONVEX_DEPLOYMENT:-}" ]] || fail "CONVEX_DEPLOYMENT must be unset when targeting self-hosted Convex."
self_hosted_target_present || fail "CONVEX_SELF_HOSTED_URL must be '$EXPECTED_SELF_HOSTED_URL' and CONVEX_SELF_HOSTED_ADMIN_KEY must be set."
vite_urls_match || fail "VITE_CONVEX_URL must be '$EXPECTED_CLOUD_URL' and VITE_CONVEX_SITE_URL must be '$EXPECTED_SITE_URL'."

echo "Convex target check passed: self-hosted production ($EXPECTED_SELF_HOSTED_URL)"
