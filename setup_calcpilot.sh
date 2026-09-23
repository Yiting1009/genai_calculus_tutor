#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Python 3.9+ is required."
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
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1 \
  || [ "$(node -p "process.versions.node.split('.')[0]")" -lt 18 ]; then
  echo "Node.js 18+ and npm are required."
  exit 1
fi

if [ ! -x .venv/bin/python ]; then
  "$PYTHON_BIN" -m venv .venv
fi

.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
(cd frontend-web && npm install)

.venv/bin/python - <<'PY'
from backend import rag

status = rag.index_status()
if not status.get("ready"):
    raise SystemExit(f"Packaged RAG index is unavailable: {status}")
matches = rag.retrieve("What is a limit?", topic="Limits", k=1)
if not matches:
    raise SystemExit("Packaged RAG semantic retrieval returned no results.")
print(
    f"RAG index ready: {status['chunks']} chunks across "
    f"{status['sections']} textbook sections; semantic retrieval verified."
)
PY

echo "CalcPilot setup complete. Run: bash run_calcpilot.sh"
