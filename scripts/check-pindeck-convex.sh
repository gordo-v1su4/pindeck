#!/usr/bin/env bash
# Pindeck-only Hostinger Convex health checks (not Unfold / Review Room).
set -euo pipefail

CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-5}"
MAX_TIME="${MAX_TIME:-15}"

CHECKS=(
  "API|https://convex.serving.cloud/version|HEAD|200"
  "HTTP_ACTIONS|https://convex-site.serving.cloud/ingestExternal|POST|200 401 404"
  "DASHBOARD|https://convex-dashboard.serving.cloud|HEAD|200"
)

status_for() {
  local url="$1"
  local method="$2"

  if [[ "${method}" == "HEAD" ]]; then
    curl -sSI -o /dev/null -w '%{http_code}' \
      --connect-timeout "${CONNECT_TIMEOUT}" \
      --max-time "${MAX_TIME}" \
      "${url}" || true
    return
  fi

  curl -sS -o /dev/null -w '%{http_code}' \
    -X "${method}" \
    --connect-timeout "${CONNECT_TIMEOUT}" \
    --max-time "${MAX_TIME}" \
    "${url}" || true
}

contains_status() {
  local expected="$1"
  local actual="$2"
  local item

  for item in ${expected}; do
    [[ "${item}" == "${actual}" ]] && return 0
  done

  return 1
}

main() {
  local failed=0
  local check label url method expected actual result

  echo "Pindeck stack only (Docker: pindeck-convex-backend-1, not review-room-convex-*)"
  echo ""

  for check in "${CHECKS[@]}"; do
    IFS='|' read -r label url method expected <<< "${check}"
    actual="$(status_for "${url}" "${method}")"
    if contains_status "${expected}" "${actual}"; then
      result="OK"
    else
      result="FAIL"
      failed=1
    fi
    printf '%-14s %-4s expected=%-18s actual=%s %s\n' \
      "${label}" "${method}" "${expected}" "${actual}" "${result}"
  done

  exit "${failed}"
}

main "$@"
