#!/bin/bash
set -euo pipefail

# Kill any process bound to the requested port.
# Usage:
#   PORT=4173 bash ./scripts/kill-port.sh
#   bash ./scripts/kill-port.sh 4173
PORT="${PORT:-${1:-4173}}"

if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN || true)"
elif command -v netstat >/dev/null 2>&1; then
  PIDS="$(netstat -anv 2>/dev/null | awk -v p=".$PORT" '$0 ~ p && $0 ~ /LISTEN/ {print $9}' | tr '\n' ' ' || true)"
else
  echo "No supported tool found to inspect port $PORT (need lsof or netstat)."
  exit 1
fi

if [ -z "${PIDS// }" ]; then
  echo "No process found on port $PORT"
  exit 0
fi

for PID in $PIDS; do
  if [ -n "$PID" ]; then
    kill -9 "$PID" >/dev/null 2>&1 || true
    echo "Killed process $PID on port $PORT"
  fi
done




