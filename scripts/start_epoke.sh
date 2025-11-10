# dynamic ROOT based on this script's location
SCRIPT_DIR="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

set -e
EPOKE="$ROOT/services/epoke-svc"; LOG="$ROOT/logs/services/epoke-svc"; mkdir -p "$LOG"
cd "$EPOKE"
lsof -tiTCP:8788 -sTCP:LISTEN | xargs -n1 kill -9 2>/dev/null || true
npm i -D tsx@4 >/dev/null 2>&1 || true
: > "$LOG/epoke-svc.out"
PORT=8788 npx --yes tsx src/index.ts >"$LOG/epoke-svc.out" 2>&1 & disown
for i in {1..40}; do sleep 0.25; curl -fsS http://127.0.0.1:8788/health >/dev/null && break || true; done
curl -s http://127.0.0.1:8788/health; echo
