#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./convex-env.sh
source "${SCRIPT_DIR}/convex-env.sh"

bun run check:prod-target
bunx convex deploy
