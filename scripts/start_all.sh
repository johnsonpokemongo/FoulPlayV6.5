#!/usr/bin/env bash
set -euo pipefail
. .venv/bin/activate
mkdir -p logs/backend logs/frontend logs/services/epoke-svc logs/services/pkmn-svc
if [ -f "services/pkmn-svc/dist/index.js" ]; then node services/pkmn-svc/dist/index.js > logs/services/pkmn-svc/out.log 2>&1 & echo $! > logs/services/pkmn-svc/pid; fi
if [ -f "services/epoke-svc/src/index.ts" ]; then npx tsx services/epoke-svc/src/index.ts > logs/services/epoke-svc/out.log 2>&1 & echo $! > logs/services/epoke-svc/pid || true; fi
uvicorn backend.main:app --host 127.0.0.1 --port 8000 > logs/backend/backend.out 2> logs/backend/backend.err & echo $! > logs/backend/pid
( cd frontend && VITE_API_BASE=http://localhost:8000 npm run dev > ../logs/frontend/frontend.out 2>&1 & echo $! > ../logs/frontend/pid )
sleep 2
curl -fsS http://127.0.0.1:8000/health >/dev/null 2>&1 && echo "Backend http://localhost:8000 [OK]" || echo "Backend http://localhost:8000 [FAIL]"
curl -fsS http://127.0.0.1:5173 >/dev/null 2>&1 && echo "Frontend http://localhost:5173 [OK]" || echo "Frontend http://localhost:5173 [FAIL]"
curl -fsS http://127.0.0.1:8000/epoke/health >/dev/null 2>&1 && echo "EPoke   http://localhost:8788 [OK]" || echo "EPoke   http://localhost:8788 [FAIL]"
curl -fsS http://127.0.0.1:8000/pkmn/health >/dev/null 2>&1 && echo "PKMN    http://localhost:8787 [OK]" || echo "PKMN    http://localhost:8787 [FAIL]"
