#!/bin/bash
# dynamic ROOT based on this script's location
SCRIPT_DIR="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

# FoulPlay V6.4 Status Check Script
# Usage: ./check_status.sh

echo "================================================"
echo "FoulPlay V6.4 - Service Status"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    if lsof -ti:"$1" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to get PID for a port
get_pid_for_port() {
    lsof -ti:"$1" 2>/dev/null | head -1
}

# Check Backend
echo "🖥️  Backend (FastAPI/Uvicorn)"
echo "   Port: 8000"
if check_port 8000; then
    PID=$(get_pid_for_port 8000)
    echo -e "   Status: ${GREEN}RUNNING${NC} (PID: $PID)"
    
    # Check health endpoint
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        HEALTH=$(curl -s http://localhost:8000/health)
        echo -e "   Health: ${GREEN}OK${NC}"
        echo "   Response: $HEALTH"
    else
        echo -e "   Health: ${RED}FAILED${NC}"
    fi
    
    # Check status endpoint
    if curl -s http://localhost:8000/status >/dev/null 2>&1; then
        STATUS=$(curl -s http://localhost:8000/status | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/status)
        BOT_RUNNING=$(echo "$STATUS" | grep -o '"running":[^,}]*' | cut -d: -f2)
        if [ "$BOT_RUNNING" = "true" ]; then
            echo -e "   Bot: ${GREEN}RUNNING${NC}"
        else
            echo -e "   Bot: ${YELLOW}STOPPED${NC}"
        fi
    fi
else
    echo -e "   Status: ${RED}NOT RUNNING${NC}"
fi
echo ""

# Check Frontend
echo "🎨 Frontend (Vite Dev Server)"
echo "   Port: 5173"
if check_port 5173; then
    PID=$(get_pid_for_port 5173)
    echo -e "   Status: ${GREEN}RUNNING${NC} (PID: $PID)"
    
    # Try to access the frontend
    if curl -s http://localhost:5173 >/dev/null 2>&1; then
        echo -e "   Accessible: ${GREEN}YES${NC}"
        echo "   URL: http://localhost:5173"
    else
        echo -e "   Accessible: ${YELLOW}STARTING...${NC}"
    fi
else
    echo -e "   Status: ${RED}NOT RUNNING${NC}"
fi
echo ""

# Check EPoké Server
echo "🤖 EPoké Stub Service"
echo "   Port: 8787"
if check_port 8787; then
    PID=$(get_pid_for_port 8787)
    echo -e "   Status: ${GREEN}RUNNING${NC} (PID: $PID)"
    
    # Check directly
    if curl -s http://127.0.0.1:8787/health >/dev/null 2>&1; then
        EPOKE_HEALTH=$(curl -s http://127.0.0.1:8787/health)
        echo -e "   Health: ${GREEN}OK${NC}"
        echo "   Response: $EPOKE_HEALTH"
    else
        echo -e "   Health: ${YELLOW}STARTING...${NC}"
    fi
    
    # Check via backend proxy
    if curl -s http://localhost:8000/epoke/health >/dev/null 2>&1; then
        BACKEND_EPOKE=$(curl -s http://localhost:8000/epoke/health)
        echo -e "   Backend Proxy: ${GREEN}OK${NC}"
        echo "   Response: $BACKEND_EPOKE"
    else
        echo -e "   Backend Proxy: ${YELLOW}NOT CONFIGURED${NC}"
    fi
else
    echo -e "   Status: ${RED}NOT RUNNING${NC}"
    echo "   Note: Run ./scripts/restart_all.sh to start"
fi
echo ""

# Check for Bot Process
echo "🎮 Bot Process (run.py)"
BOT_PIDS=$(pgrep -f "run.py" 2>/dev/null)
if [ -n "$BOT_PIDS" ]; then
    echo -e "   Status: ${GREEN}RUNNING${NC}"
    echo "   PIDs: $BOT_PIDS"
else
    echo -e "   Status: ${YELLOW}NOT RUNNING${NC}"
    echo "   Note: Start from UI or run bot manually"
fi
echo ""

# Check Log Files
echo "📋 Recent Logs"
PROJECT_
if [ -f "$PROJECT_ROOT/logs/bot/bot.log" ]; then
    LINES=$(wc -l < "$PROJECT_ROOT/logs/bot/bot.log" 2>/dev/null || echo "0")
    echo "   Bot Log: $LINES lines"
    if [ "$LINES" -gt 0 ]; then
        echo "   Last entry:"
        tail -1 "$PROJECT_ROOT/logs/bot/bot.log" | sed 's/^/     /'
    fi
else
    echo "   Bot Log: Not found"
fi

if [ -f "$PROJECT_ROOT/logs/backend/backend.log" ]; then
    LINES=$(wc -l < "$PROJECT_ROOT/logs/backend/backend.log" 2>/dev/null || echo "0")
    echo "   Backend Log: $LINES lines"
else
    echo "   Backend Log: Not found"
fi

if [ -f "$PROJECT_ROOT/logs/frontend/frontend.log" ]; then
    LINES=$(wc -l < "$PROJECT_ROOT/logs/frontend/frontend.log" 2>/dev/null || echo "0")
    echo "   Frontend Log: $LINES lines"
else
    echo "   Frontend Log: Not found"
fi

if [ -f "$PROJECT_ROOT/logs/epoke/epoke.log" ]; then
    LINES=$(wc -l < "$PROJECT_ROOT/logs/epoke/epoke.log" 2>/dev/null || echo "0")
    echo "   EPoké Log: $LINES lines"
else
    echo "   EPoké Log: Not found"
fi

if [ -f "$PROJECT_ROOT/logs/decisions/decisions.jsonl" ]; then
    LINES=$(wc -l < "$PROJECT_ROOT/logs/decisions/decisions.jsonl" 2>/dev/null || echo "0")
    echo "   Decisions Log: $LINES decisions"
else
    echo "   Decisions Log: Not found"
fi
echo ""

# System Resources
echo "💻 System Resources"
if command -v python3 &> /dev/null; then
    echo -e "   Python: ${GREEN}$(python3 --version)${NC}"
else
    echo -e "   Python: ${RED}NOT FOUND${NC}"
fi

if command -v node &> /dev/null; then
    echo -e "   Node.js: ${GREEN}$(node --version)${NC}"
else
    echo -e "   Node.js: ${RED}NOT FOUND${NC}"
fi

if command -v npm &> /dev/null; then
    echo -e "   npm: ${GREEN}$(npm --version)${NC}"
else
    echo -e "   npm: ${RED}NOT FOUND${NC}"
fi
echo ""

# Quick Actions
echo "================================================"
echo "🔧 Quick Actions"
echo "================================================"
echo ""
echo "View logs:"
echo "  Backend:   tail -f $PROJECT_ROOT/logs/backend/backend.log"
echo "  Frontend:  tail -f $PROJECT_ROOT/logs/frontend/frontend.log"
echo "  Bot:       tail -f $PROJECT_ROOT/logs/bot/bot.log"
echo "  EPoké:     tail -f $PROJECT_ROOT/logs/epoke/epoke.log"
echo "  Decisions: tail -f $PROJECT_ROOT/logs/decisions/decisions.jsonl"
echo ""
echo "Test endpoints:"
echo "  Backend health:  curl http://localhost:8000/health"
echo "  Backend status:  curl http://localhost:8000/status"
echo "  EPoké health:    curl http://127.0.0.1:8787/health"
echo "  EPoké (proxy):   curl http://localhost:8000/epoke/health"
echo ""
echo "Access URLs:"
echo "  Frontend:        http://localhost:5173"
echo "  Backend API:     http://localhost:8000"
echo "  API Docs:        http://localhost:8000/docs"
echo ""
echo "Control:"
echo "  Restart all:     ./scripts/restart_all.sh"
echo "  Stop all:        ./scripts/stop_all_services.sh"
echo "  Clean logs:      ./scripts/reorganize_logs.sh"
echo ""
