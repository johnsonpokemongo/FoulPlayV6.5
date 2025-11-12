#!/usr/bin/env bash
set -euo pipefail
PORT_BE="${PORT_BE:-8000}"
PORT_FE="${PORT_FE:-5173}"
ok=1
wait_http() { for i in $(seq 1 30); do curl -fsS --ipv4 "$1" >/dev/null 2>&1 && return 0; sleep 0.5; done; return 1; }
check() { n="$1"; u="$2"; req="$3"; if wait_http "$u"; then echo "$n OK"; else echo "$n FAIL"; [ "$req" = "1" ] && ok=0; fi; }
check "BACKEND" "http://127.0.0.1:$PORT_BE/health" 1
check "FRONTEND" "http://127.0.0.1:$PORT_FE/" 1
check "PKMN" "http://127.0.0.1:$PORT_BE/pkmn/health" 1
check "EPOKE" "http://127.0.0.1:$PORT_BE/epoke/health" 0
check "LOGS_BACKEND" "http://127.0.0.1:$PORT_BE/logs/backend?n=5" 1
check "LOGS_FRONTEND" "http://127.0.0.1:$PORT_BE/logs/frontend/tail?n=5" 1
if [ "$ok" -eq 1 ]; then exit 0; else exit 1; fi
