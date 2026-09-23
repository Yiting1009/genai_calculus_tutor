#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

if [ ! -x .venv/bin/python ] || [ ! -d frontend-web/node_modules ]; then
  echo "Dependencies are missing. Run: bash setup_calcpilot.sh"
  exit 1
fi
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
else
  NODE_MAJOR=0
fi
if [ "$NODE_MAJOR" -lt 18 ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
  set +u
  # shellcheck source=/dev/null
  source "$HOME/.nvm/nvm.sh"
  nvm use 20 >/dev/null
  set -u
fi
if ! command -v node >/dev/null 2>&1 || [ "$(node -p "process.versions.node.split('.')[0]")" -lt 18 ]; then
  echo "Node.js 18+ is required."
  exit 1
fi

cleanup() {
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo "CalcPilot is starting at http://127.0.0.1:5175"
cd frontend-web
npm run dev -- --host 127.0.0.1
