#!/usr/bin/env bash
# Remove automated E2E/smoke rows from the Upload lane (pending/draft/processing).
# Does NOT delete active Gallery/Table library images.
#
# Full account wipe (destructive): PURGE_MODE=entire-account PURGE_CONFIRM=yes-delete-entire-library-account
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

load_env_value() {
  local key="$1"
  local line
  line="$(tr -d '\r' < .env | grep -m1 "^${key}=" || true)"
  [[ -n "$line" ]] || return 0
  printf -v "$key" '%s' "${line#*=}"
  export "$key"
}

[[ -f .env ]] || {
  echo "ERROR: Missing .env" >&2
  exit 1
}
load_env_value PINDECK_USER_ID

[[ -n "${PINDECK_USER_ID:-}" ]] || {
  echo "ERROR: PINDECK_USER_ID is empty in .env" >&2
  exit 1
}

PURGE_MODE="${PURGE_MODE:-upload-clutter}"

if [[ "$PURGE_MODE" == "entire-account" ]]; then
  if [[ "${PURGE_CONFIRM:-}" != "yes-delete-entire-library-account" ]]; then
    echo "Refusing entire-account purge without PURGE_CONFIRM=yes-delete-entire-library-account" >&2
    exit 1
  fi
  echo "Purging ALL images for user ${PINDECK_USER_ID} (Gallery + Upload)..." >&2
  bun run check:prod-target
  bunx convex run images/lifecycle:internalPurgeAllImagesForUser \
    "{\"userId\":\"${PINDECK_USER_ID}\"}"
  exit 0
fi

echo "Purging E2E Upload-lane clutter for user ${PINDECK_USER_ID} (keeps active library)..." >&2
bun run check:prod-target
bunx convex run images/lifecycle:internalPurgeUploadClutterForUser \
  "{\"userId\":\"${PINDECK_USER_ID}\"}"
