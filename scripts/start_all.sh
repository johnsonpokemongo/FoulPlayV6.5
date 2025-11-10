#!/usr/bin/env bash
# dynamic ROOT based on this script's location
SCRIPT_DIR="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
[ -f ".venv/bin/activate" ] && . ".venv/bin/activate"
mkdir -p logs
PORT_BE="${PORT_BE:-8000}"
PORT_FE="${PORT_FE:-5173}"
PORT_PKMN="${PORT_PKMN:-8787}"
PORT_EPOKE="${PORT_EPOKE:-8788}"
kill_port(){ local p="$1"; local x; x="$(lsof -nP -iTCP:$p -sTCP:LISTEN -t || true)"; [ -n "$x" ] && kill $x 2>/dev/null || true; sleep 0.2; x="$(lsof -nP -iTCP:$p -sTCP:LISTEN -t || true)"; [ -n "$x" ] && kill -9 $x 2>/dev/null || true; }
probe(){ curl -fsS "$1" >/dev/null 2>&1; }
wait_http(){ local a="$1"; local b="${2:-}"; local n="${3:-180}"; for i in $(seq 1 "$n"); do probe "$a" && return 0; [ -n "$b" ] && probe "$b" && return 0; sleep 0.5; done; return 1; }
find_dir(){ for d in "$@"; do [ -d "$d" ] && { echo "$d"; return 0; }; done; return 1; }
PKMN_DIR="$(find_dir "$ROOT/pkmn-svc" "$ROOT/services/pkmn-svc" || true)"
EPOKE_DIR="$(find_dir "$ROOT/epoke-svc" "$ROOT/services/epoke-svc" || true)"
kill_port "$PORT_BE"; kill_port "$PORT_PKMN"; kill_port "$PORT_EPOKE"; kill_port "$PORT_FE"
export PKMN_SVC_URL="http://127.0.0.1:$PORT_PKMN"
export EPOKE_URL="http://127.0.0.1:$PORT_EPOKE/infer"
python -m uvicorn backend.main:app --host 127.0.0.1 --port "$PORT_BE" > logs/backend.out 2>&1 &
BE_PID=$!
wait_http "http://127.0.0.1:$PORT_BE/health" || { tail -n 120 logs/backend.out || true; kill $BE_PID 2>/dev/null || true; exit 1; }
NPM=""
for b in npm pnpm yarn; do command -v "$b" >/dev/null 2>&1 && { NPM="$b"; break; }; done
if [ -n "$PKMN_DIR" ]; then
  (
    cd "$PKMN_DIR"
    if [ -f package.json ] && "$NPM" run dev >/dev/null 2>&1; then :
    elif [ -f package.json ] && "$NPM" start >/dev/null 2>&1; then :
    elif [ -f dist/index.js ]; then node dist/index.js >/dev/null 2>&1 &
    elif [ -f index.js ]; then node index.js >/dev/null 2>&1 &
    else
      "$NPM" run dev > "$ROOT/logs/pkmn.out" 2>&1 || "$NPM" start > "$ROOT/logs/pkmn.out" 2>&1 || node dist/index.js > "$ROOT/logs/pkmn.out" 2>&1
    fi
  ) > "$ROOT/logs/pkmn.out" 2>&1 &
  echo $! > logs/.pkmn.pid
  PKMN_PID="$(cat logs/.pkmn.pid)"; rm -f logs/.pkmn.pid
  wait_http "http://127.0.0.1:$PORT_PKMN/health" "http://127.0.0.1:$PORT_PKMN" || { tail -n 120 logs/pkmn.out || true; kill $PKMN_PID $BE_PID 2>/dev/null || true; exit 1; }
else
  PKMN_PID=""
fi
if [ -n "$EPOKE_DIR" ]; then
  (
    cd "$EPOKE_DIR"
    if [ -f epoke_svc.py ]; then PORT="$PORT_EPOKE" python epoke_svc.py
    elif [ -f app.py ]; then PORT="$PORT_EPOKE" python app.py
    else printf "no entry file\n" 1>&2
    fi
  ) > "$ROOT/logs/epoke.out" 2>&1 &
  echo $! > logs/.epoke.pid
  EPOKE_PID="$(cat logs/.epoke.pid)"; rm -f logs/.epoke.pid
  wait_http "http://127.0.0.1:$PORT_EPOKE/health" "http://127.0.0.1:$PORT_EPOKE" || { tail -n 120 logs/epoke.out || true; kill $EPOKE_PID $PKMN_PID $BE_PID 2>/dev/null || true; exit 1; }
else
  EPOKE_PID=""
fi
( cd frontend; VITE_API_BASE="http://localhost:$PORT_BE" "$NPM" run dev > "$ROOT/logs/frontend.out" 2>&1 ) &
echo $! > logs/.fe.pid
FE_PID="$(cat logs/.fe.pid)"; rm -f logs/.fe.pid
wait_http "http://localhost:$PORT_FE" "http://127.0.0.1:$PORT_FE" || { tail -n 120 logs/frontend.out || true; kill $FE_PID $EPOKE_PID $PKMN_PID $BE_PID 2>/dev/null || true; exit 1; }
echo "Backend:  http://127.0.0.1:$PORT_BE/health"
[ -n "$PKMN_DIR" ] && echo "PKMN:     http://127.0.0.1:$PORT_PKMN ($PKMN_DIR)" || echo "PKMN:     skipped"
[ -n "$EPOKE_DIR" ] && echo "EPoké:    http://127.0.0.1:$PORT_EPOKE ($EPOKE_DIR)" || echo "EPoké:    skipped"
echo "Frontend: http://localhost:$PORT_FE"
trap 'kill $FE_PID $EPOKE_PID $PKMN_PID $BE_PID 2>/dev/null || true; exit 0' INT TERM
wait
