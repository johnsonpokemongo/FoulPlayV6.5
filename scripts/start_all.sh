#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
cd "$ROOT"
. .venv/bin/activate
mkdir -p "$ROOT/logs/backend" "$ROOT/logs/frontend" "$ROOT/logs/services/epoke-svc" "$ROOT/logs/services/pkmn-svc"

PORT_BE="${PORT_BE:-8000}"
PORT_FE="${PORT_FE:-5173}"

PID=$(lsof -ti:5173 -sTCP:LISTEN) && kill $PID || true

uvicorn backend.main:app --host 127.0.0.1 --port "$PORT_BE" > "$ROOT/logs/backend/backend.out" 2> "$ROOT/logs/backend/backend.err" & echo $! > "$ROOT/logs/backend/pid"

if [ -d "$ROOT/services/pkmn-svc" ]; then
  if [ ! -f "$ROOT/services/pkmn-svc/dist/index.js" ] && [ -f "$ROOT/services/pkmn-svc/package.json" ]; then (cd "$ROOT/services/pkmn-svc" && npm run build >/dev/null 2>&1 || true); fi
  if [ -f "$ROOT/services/pkmn-svc/dist/index.js" ]; then node "$ROOT/services/pkmn-svc/dist/index.js" > "$ROOT/logs/services/pkmn-svc/out.log" 2>&1 & echo $! > "$ROOT/logs/services/pkmn-svc/pid"; fi
fi

if [ -d "$ROOT/services/epoke-svc" ]; then
  if [ -f "$ROOT/services/epoke-svc/src/index.ts" ]; then npx tsx "$ROOT/services/epoke-svc/src/index.ts" > "$ROOT/logs/services/epoke-svc/out.log" 2>&1 & echo $! > "$ROOT/logs/services/epoke-svc/pid" || true; fi
  if [ -f "$ROOT/services/epoke-svc/dist/index.js" ]; then node "$ROOT/services/epoke-svc/dist/index.js" > "$ROOT/logs/services/epoke-svc/out.log" 2>&1 & echo $! > "$ROOT/logs/services/epoke-svc/pid" || true; fi
fi

( cd "$ROOT/frontend" && VITE_API_BASE="http://localhost:$PORT_BE" npm run dev -- --host 127.0.0.1 --port "$PORT_FE" --strictPort > "$ROOT/logs/frontend/frontend.log" 2>&1 & echo $! > "$ROOT/logs/frontend/pid" )

wait_http() { for i in $(seq 1 20); do curl -fsSL "http://127.0.0.1:$1" >/dev/null 2>&1 && return 0; sleep 0.5; done; return 1; }

wait_http "$PORT_BE/health" && echo "Backend http://localhost:$PORT_BE [OK]" || echo "Backend http://localhost:$PORT_BE [FAIL]"
wait_http "$PORT_FE" && echo "Frontend http://localhost:$PORT_FE [OK]" || echo "Frontend http://localhost:$PORT_FE [FAIL]"
curl -fsS "http://127.0.0.1:$PORT_BE/epoke/health" >/dev/null 2>&1 && echo "EPoke   http://localhost:8788 [OK]" || echo "EPoke   http://localhost:8788 [FAIL]"
curl -fsS "http://127.0.0.1:$PORT_BE/pkmn/health"  >/dev/null 2>&1 && echo "PKMN    http://localhost:8787 [OK]" || echo "PKMN    http://localhost:8787 [FAIL]"
