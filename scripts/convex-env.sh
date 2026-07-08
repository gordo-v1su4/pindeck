#!/usr/bin/env bash
# Shared Convex environment aliases for Pindeck.
# Source this file from scripts that call the Convex CLI.

if [[ -z "${CONVEX_SELF_HOSTED_ADMIN_KEY:-}" && -n "${PINDECK_CONVEX_SELF_HOSTED_ADMIN_KEY:-}" ]]; then
  export CONVEX_SELF_HOSTED_ADMIN_KEY="${PINDECK_CONVEX_SELF_HOSTED_ADMIN_KEY}"
fi
