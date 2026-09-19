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

RUN_ID="${E2E_RUN_ID:-$(date +%s)}"

# Default fixture: a PNG from ~/Downloads (unique temp URL per run). Override with E2E_TEST_IMAGE_PATH or E2E_TEST_IMAGE_URL.
resolve_e2e_png_path() {
  if [[ -n "${E2E_TEST_IMAGE_PATH:-}" && -f "${E2E_TEST_IMAGE_PATH}" ]]; then
    printf '%s' "${E2E_TEST_IMAGE_PATH}"
    return 0
  fi
  local hooded="${HOME}/Downloads/_Hooded_Figures_Mask_Low-angle_fisheye_shot_-_The_hooded_figure_c7f4f8f0-125c-4029-bfaa-4ad33b2ddc73.png"
  if [[ -f "$hooded" ]]; then
    printf '%s' "$hooded"
    return 0
  fi
  find "${HOME}/Downloads" -maxdepth 1 -type f -iname '*.png' -print0 2>/dev/null \
    | xargs -0 ls -t 2>/dev/null \
    | head -n 1
}

publish_local_png_url() {
  local path="$1"
  local base
  base="$(basename "$path")"
  local name="e2e-${RUN_ID}-${base}"
  local url=""
  url="$(curl -fsS -F "fileToUpload=@${path}" -F "reqtype=fileupload" "https://catbox.moe/user/api.php" 2>/dev/null || true)"
  if [[ -n "$url" && "$url" == https://* ]]; then
    printf '%s' "$url"
    return 0
  fi
  url="$(curl -fsS -F "file=@${path};filename=${name}" "https://0x0.st/${name}" 2>/dev/null || true)"
  if [[ -n "$url" && "$url" == https://* ]]; then
    printf '%s' "$url"
    return 0
  fi
  echo "ERROR: Could not publish local PNG (catbox + 0x0.st failed). Set E2E_TEST_IMAGE_URL." >&2
  return 1
}

if [[ -n "${E2E_TEST_IMAGE_URL:-}" ]]; then
  TEST_IMAGE_URL="$E2E_TEST_IMAGE_URL"
else
  LOCAL_PNG="$(resolve_e2e_png_path || true)"
  if [[ -n "${LOCAL_PNG:-}" && -f "$LOCAL_PNG" ]]; then
    echo "== E2E fixture from Downloads ==" >&2
    echo "${LOCAL_PNG}" >&2
    TEST_IMAGE_URL="$(publish_local_png_url "$LOCAL_PNG")"
    echo "Published temp URL for ingest (this run only)" >&2
  else
    echo "WARN: No PNG in ~/Downloads; set E2E_TEST_IMAGE_PATH. Falling back to Wikimedia pool." >&2
    E2E_IMAGE_POOL=(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/120px-PNG_transparency_demonstration_1.png"
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/120px-Fronalpstock_big.jpg"
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/120px-Image_created_with_a_mobile_phone.png"
    )
    pool_seed="$(printf '%s' "$RUN_ID" | cksum | awk '{print $1}')"
    pool_index=$((pool_seed % ${#E2E_IMAGE_POOL[@]}))
    TEST_IMAGE_URL="${E2E_IMAGE_POOL[$pool_index]}"
  fi
fi

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

echo "== Trigger orchestration callbacks (unauthenticated expect 401) =="
ORCH_PATHS=(
  "/orchestration/image-refresh"
  "/orchestration/media-finalize"
  "/orchestration/external-ingest"
  "/orchestration/media-repair"
  "/orchestration/generate-variations/prepare"
  "/orchestration/generate-variations/persist"
  "/orchestration/generate-variations/complete"
)
for orch_path in "${ORCH_PATHS[@]}"; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "${SITE_URL}${orch_path}" \
    -H "Content-Type: application/json" \
    -d '{}')"
  [[ "$code" == "401" ]] || {
    echo "ERROR: ${orch_path} expected 401 without callback token, got $code" >&2
    exit 1
  }
done
echo "OK — ${#ORCH_PATHS[@]} orchestration routes reject unauthenticated POST"

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

  echo "== ingestExternal (${source_type}) ==" >&2
  local resp
  resp="$(post_json "/ingestExternal" "$payload")"
  echo "$resp" | jq . >&2
  local image_id
  image_id="$(echo "$resp" | jq -r '.imageId // empty')"
  [[ -n "$image_id" ]] || {
    echo "ERROR: ingestExternal missing imageId" >&2
    exit 1
  }
  local is_duplicate
  is_duplicate="$(echo "$resp" | jq -r '.duplicate // false')"

  if [[ "$is_duplicate" == "true" ]]; then
    echo "(duplicate ingest — skip queue/moderate for ${source_type})" >&2
    echo "$image_id"
    return 0
  fi

  echo "== discordQueue (list pending for ${source_type} image) ==" >&2
  local queue_payload
  queue_payload="$(jq -nc \
    --arg userId "$PINDECK_USER_ID" \
    --arg imageId "$image_id" \
    '{userId:$userId,imageId:$imageId,limit:20}')"
  local queue_resp
  queue_resp="$(post_json "/discordQueue" "$queue_payload")"
  echo "$queue_resp" | jq '{userId, count:(.items|length), ids:[.items[]._id]}' >&2

  echo "== discordModerate approve ==" >&2
  local mod_payload
  mod_payload="$(jq -nc \
    --arg userId "$PINDECK_USER_ID" \
    --arg imageId "$image_id" \
    '{userId:$userId,imageId:$imageId,action:"approve"}')"
  local approve_resp
  approve_resp="$(post_json "/discordModerate" "$mod_payload")"
  echo "$approve_resp" | jq . >&2

  if [[ "${E2E_GENERATE:-}" == "1" ]]; then
    echo "== discordModerate generate (E2E_GENERATE=1 — calls fal/OpenRouter) ==" >&2
    mod_payload="$(jq -nc \
      --arg userId "$PINDECK_USER_ID" \
      --arg imageId "$image_id" \
      '{userId:$userId,imageId:$imageId,action:"generate"}')"
    max_wait="${E2E_GENERATE_MAX_WAIT_SEC:-240}"
    interval="${E2E_GENERATE_POLL_SEC:-15}"
    elapsed=0
    generate_ok=0
    while [[ "$elapsed" -lt "$max_wait" ]]; do
      http_code="$(curl -sS -o /tmp/pindeck-e2e-generate.json -w '%{http_code}' -X POST "${SITE_URL}/discordModerate" \
        -H "Content-Type: application/json" \
        -H "$auth_header" \
        -d "$mod_payload")"
      if [[ "$http_code" == "200" ]]; then
        jq . /tmp/pindeck-e2e-generate.json >&2
        generate_ok=1
        break
      fi
      err_msg="$(jq -r '.error // .message // empty' /tmp/pindeck-e2e-generate.json 2>/dev/null || cat /tmp/pindeck-e2e-generate.json)"
      if [[ "$http_code" == "400" ]] && [[ "$err_msg" == *"already processing"* ]]; then
        echo "(generate blocked — analysis still running; retry in ${interval}s, ${elapsed}/${max_wait}s)" >&2
        sleep "$interval"
        elapsed=$((elapsed + interval))
        continue
      fi
      echo "ERROR: discordModerate generate failed (HTTP ${http_code}): ${err_msg}" >&2
      exit 1
    done
    [[ "$generate_ok" == "1" ]] || {
      echo "ERROR: generate did not succeed within ${max_wait}s (image still processing)" >&2
      exit 1
    }
  else
    echo "(skip variation generate; set E2E_GENERATE=1 to run fal pipeline)" >&2
  fi

  echo "$image_id"
}

discord_id="$(ingest_source discord)"
pinterest_id="$(ingest_source pinterest)"

echo "== Summary =="
echo "discord imageId:  $discord_id"
echo "pinterest imageId: $pinterest_id"
echo "OK — ingest, queue, and approve paths succeeded against ${SITE_URL}"
