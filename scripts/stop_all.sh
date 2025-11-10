#!/bin/bash
# dynamic ROOT based on this script's location
SCRIPT_DIR="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================"
echo "Stopping All FoulPlay Services"
echo "============================================"
echo ""

STOPPED=0

echo "1. Stopping via backend /stop endpoint..."
curl -X POST http://127.0.0.1:8000/stop 2>/dev/null && echo -e "${GREEN}✓ Backend stop called${NC}" || echo -e "${YELLOW}⚠ Backend not responding${NC}"

echo ""
echo "2. Killing processes on known ports..."
for port in 8000 8787 8788 5173; do
    PID=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "  Killing process on port $port (PID: $PID)"
        kill $PID 2>/dev/null || kill -9 $PID 2>/dev/null || true
        STOPPED=$((STOPPED + 1))
    fi
done

echo ""
echo "3. Cleaning up PID file..."
if [ -f ".v6.5-upgrade/running_pids.txt" ]; then
    while read pid; do
        if ps -p $pid > /dev/null 2>&1; then
            echo "  Killing tracked PID: $pid"
            kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
            STOPPED=$((STOPPED + 1))
        fi
    done < .v6.5-upgrade/running_pids.txt
    rm .v6.5-upgrade/running_pids.txt
    echo -e "${GREEN}✓ PID file cleaned${NC}"
else
    echo "  No PID file found"
fi

echo ""
echo "============================================"
echo "Stopped $STOPPED process(es)"
echo "============================================"
echo ""

if [ $STOPPED -eq 0 ]; then
    echo "No services were running."
else
    echo "All services stopped."
fi
