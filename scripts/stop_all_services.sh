#!/usr/bin/env bash
# FoulPlay V6.4 - Stop All Services

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "================================================"
echo "FoulPlay V6.4 - Stopping All Services"
echo "================================================"
echo ""

# Ports to clear
BACK_PORT="${BACK_PORT:-8000}"
FRONT_PORT="${FRONT_PORT:-5173}"
EPOKE_PORT="${EPOKE_PORT:-8787}"

# Function to kill process on port
kill_port() {
    local PORT=$1
    local NAME=$2
    local PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
    
    if [ -n "$PIDS" ]; then
        echo "🛑 Stopping $NAME (port $PORT, PID: $PIDS)..."
        kill -9 $PIDS 2>/dev/null || true
        sleep 0.5
        echo -e "${GREEN}✓ $NAME stopped${NC}"
    else
        echo -e "${YELLOW}⚠  $NAME not running (port $PORT)${NC}"
    fi
}

# Stop services by port
kill_port $BACK_PORT "Backend"
kill_port $FRONT_PORT "Frontend"
kill_port $EPOKE_PORT "EPoké"

echo ""
echo "🧹 Cleaning up processes..."

# Kill by process name as backup
pkill -f "uvicorn main:app" 2>/dev/null && echo "  Killed uvicorn" || true
pkill -f "npm run dev" 2>/dev/null && echo "  Killed vite" || true
pkill -f "epoke_svc.py" 2>/dev/null && echo "  Killed EPoké stub" || true
pkill -f "run.py" 2>/dev/null && echo "  Killed bot" || true

echo ""
echo "================================================"
echo "✅ All services stopped"
echo "================================================"
