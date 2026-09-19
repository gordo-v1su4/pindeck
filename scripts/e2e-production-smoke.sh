#!/usr/bin/env bash
# End-to-end smoke against Pindeck production Convex + RustFS ingest paths.
# Loads secrets from .env without evaluating JWT/shell-unsafe lines.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

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
[[ -f "$env_file" ]] || {
  echo "ERROR: Missing .env (copy from .env.example)" >&2
  exit 1
}

for key in VITE_CONVEX_SITE_URL INGEST_API_KEY PINDECK_USER_ID; do
  load_env_value "$key" "$env_file"
done

SITE_URL="${VITE_CONVEX_SITE_URL:-https://convex-site.serving.cloud}"
SITE_URL="${SITE_URL%/}"

[[ -n "${INGEST_API_KEY:-}" ]] || {
  echo "ERROR: INGEST_API_KEY is empty in .env" >&2
  exit 1
}
[[ -n "${PINDECK_USER_ID:-}" ]] || {
  echo "ERROR: PINDECK_USER_ID is empty in .env" >&2
  exit 1
}

# Small public PNG — Convex actions fetch this for RustFS persist (non-Trigger path).
TEST_IMAGE_URL="${E2E_TEST_IMAGE_URL:-https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/120px-PNG_transparency_demonstration_1.png}"
RUN_ID="${E2E_RUN_ID:-$(date +%s)}"

echo "== Pindeck Convex health =="
./scripts/check-pindeck-convex.sh

auth_header="Authorization: Bearer ${INGEST_API_KEY}"

post_json() {
  local path="$1"
  local payload="$2"
  curl -fsS -X POST "${SITE_URL}${path}" \
    -H "Content-Type: application/json" \
    -H "$auth_header" \
    -d "$payload"
}

echo "== HTTP auth negative (expect 401) =="
code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "${SITE_URL}/ingestExternal" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/x.png","userId":"'"${PINDECK_USER_ID}"'"}')"
[[ "$code" == "401" ]] || {
  echo "ERROR: expected 401 without Bearer, got $code" >&2
  exit 1
}

ingest_source() {
  local source_type="$1"
  local external_id="e2e-${source_type}-${RUN_ID}"
  local title="E2E ${source_type} ${RUN_ID}"
  local payload
  payload="$(jq -nc \
    --arg userId "$PINDECK_USER_ID" \
    --arg imageUrl "$TEST_IMAGE_URL" \
    --arg externalId "$external_id" \
    --arg sourceType "$source_type" \
    --arg title "$title" \
    --arg sourceUrl "https://example.com/${source_type}/${RUN_ID}" \
    '{userId:$userId,imageUrl:$imageUrl,externalId:$externalId,sourceType:$sourceType,title:$title,sourceUrl:$sourceUrl,tags:["e2e","original"]}')"

  echo "== ingestExternal (${source_type}) =="
  local resp
  resp="$(post_json "/ingestExternal" "$payload")"
  echo "$resp" | jq .
  local image_id
  image_id="$(echo "$resp" | jq -r '.imageId // empty')"
  [[ -n "$image_id" ]] || {
    echo "ERROR: ingestExternal missing imageId" >&2
    exit 1
  }

  echo "== discordQueue (list pending for ${source_type} image) =="
  local queue_payload
  queue_payload="$(jq -nc \
    --arg userId "$PINDECK_USER_ID" \
    --arg imageId "$image_id" \
    '{userId:$userId,imageId:$imageId,limit:20}')"
  local queue_resp
  queue_resp="$(post_json "/discordQueue" "$queue_payload")"
  echo "$queue_resp" | jq '{userId, count:(.items|length), ids:[.items[]._id]}'

  echo "== discordModerate approve =="
  local mod_payload
  mod_payload="$(jq -nc \
    --arg userId "$PINDECK_USER_ID" \
    --arg imageId "$image_id" \
    '{userId:$userId,imageId:$imageId,action:"approve"}')"
  post_json "/discordModerate" "$mod_payload" | jq .

  if [[ "${E2E_GENERATE:-}" == "1" ]]; then
    echo "== discordModerate generate (E2E_GENERATE=1 — calls fal/OpenRouter) =="
    mod_payload="$(jq -nc \
      --arg userId "$PINDECK_USER_ID" \
      --arg imageId "$image_id" \
      '{userId:$userId,imageId:$imageId,action:"generate"}')"
    post_json "/discordModerate" "$mod_payload" | jq .
  else
    echo "(skip variation generate; set E2E_GENERATE=1 to run fal pipeline)"
  fi

  echo "$image_id"
}

discord_id="$(ingest_source discord)"
pinterest_id="$(ingest_source pinterest)"

echo "== Summary =="
echo "discord imageId:  $discord_id"
echo "pinterest imageId: $pinterest_id"
echo "OK — ingest, queue, and approve paths succeeded against ${SITE_URL}"
