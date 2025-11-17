#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

killport(){ p=$(lsof -nti tcp:$1 -sTCP:LISTEN 2>/dev/null || true); [ -n "$p" ] && kill -9 $p || true; }

curl -s -X POST http://127.0.0.1:8000/stop >/dev/null 2>&1 || true
pkill -f 'uvicorn.*backend\.main:app' 2>/dev/null || true
pkill -f 'node .*services/epoke-svc' 2>/dev/null || true

for port in 8000 5173 8787 8788; do killport $port; done

echo "Stopped."
