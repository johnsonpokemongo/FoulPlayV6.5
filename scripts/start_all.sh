#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

killport(){ p=$(lsof -nti tcp:$1 -sTCP:LISTEN 2>/dev/null || true); [ -n "$p" ] && kill -9 $p || true; }
for port in 8000 5173 8787 8788; do killport $port; done
pkill -f 'uvicorn.*backend\.main:app' 2>/dev/null || true
pkill -f 'node .*services/epoke-svc' 2>/dev/null || true

mkdir -p logs/backend logs/frontend logs/bot logs/services/epoke-svc logs/services/pkmn-svc

# Python env + deps
if [ -d ".venv" ]; then . ".venv/bin/activate" || true; fi
grep -q '^python-dateutil' requirements.txt 2>/dev/null || printf '\npython-dateutil==2.9.0.post0\n' >> requirements.txt
pip install -r requirements.txt >/dev/null 2>&1 || true

# Backend
nohup python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload > logs/backend/backend.log 2>&1 &
echo $! > logs/backend/pid

# EPoké
( cd services/epoke-svc && npm install >/dev/null 2>&1 || true && nohup npm run start > ../../logs/services/epoke-svc/epoke.log 2>&1 & echo $! > ../../logs/services/epoke-svc/pid )

# Frontend
( cd frontend && npm install >/dev/null 2>&1 || true && nohup npm run dev -- --host --port 5173 > ../logs/frontend/frontend.log 2>&1 & echo $! > ../logs/frontend/pid )

sleep 2
curl -s http://127.0.0.1:8000/health ; echo
curl -s http://127.0.0.1:8000/backend ; echo
curl -s http://127.0.0.1:8788/health ; echo
