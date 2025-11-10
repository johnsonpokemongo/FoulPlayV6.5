# dynamic ROOT based on this script's location
SCRIPT_DIR="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

set -e
mkdir -p "$ROOT/logs/backend"
lsof -tiTCP:8000 -sTCP:LISTEN | xargs -n1 kill -9 2>/dev/null || true
pkill -f "uvicorn.*backend\.main:app" || true
PY="$ROOT/.venv/bin/python"; [ -x "$PY" ] || PY="$(command -v python3)"
cd "$ROOT"
PYTHONPATH="$ROOT" "$PY" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload >"$ROOT/logs/backend/backend.out" 2>&1 & disown
for i in {1..40}; do sleep 0.25; curl -fsS http://127.0.0.1:8000/epoke/health >/dev/null && break || true; done
curl -s http://127.0.0.1:8000/epoke/health; echo
