#!/usr/bin/env bash
set -euo pipefail

if [[ "${VERCEL:-}" == "1" ]]; then
  bun run check:prod-target
  bunx convex deploy --cmd 'bun run build:frontend'
else
  bun run build:frontend
fi
