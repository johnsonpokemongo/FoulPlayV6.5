#!/bin/bash
# dynamic ROOT based on this script's location
SCRIPT_DIR="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "============================================"
echo "FoulPlay Emergency Fix Kit"
echo "============================================"
echo ""
echo "This script fixes the 5 most common issues:"
echo "  1. Backend shows 'Already running' (409)"
echo "  2. Frontend has Python syntax (try:/except:)"
echo "  3. Ports still in use from previous run"
echo "  4. Missing Python dependencies"
echo "  5. Frontend node_modules corrupted"
echo ""

read -p "Run all fixes? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FIX 1: Clear 'Already Running' State"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "backend/main.py" ]; then
    echo "Calling /stop endpoint..."
    curl -X POST http://127.0.0.1:8000/stop 2>/dev/null || echo "Backend not running (OK)"
    
    echo "Clearing any stale PIDs..."
    if [ -f ".v6.5-upgrade/running_pids.txt" ]; then
        while read pid; do
            if ps -p $pid > /dev/null 2>&1; then
                echo "  Killing PID $pid"
                kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
            fi
        done < .v6.5-upgrade/running_pids.txt
        rm .v6.5-upgrade/running_pids.txt
    fi
    
    echo -e "${GREEN}✓ Runner state cleared${NC}"
else
    echo -e "${YELLOW}⚠ backend/main.py not found${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FIX 2: Check Frontend for Python Syntax"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GUI_FILE=""
if [ -f "frontend/src/FoulPlayGUI.jsx" ]; then
    GUI_FILE="frontend/src/FoulPlayGUI.jsx"
elif [ -f "frontend/src/App.jsx" ]; then
    GUI_FILE="frontend/src/App.jsx"
fi

if [ -n "$GUI_FILE" ]; then
    ISSUES=0
    
    if grep -q "try:" "$GUI_FILE"; then
        echo -e "${RED}✗ Found Python-style 'try:' in $GUI_FILE${NC}"
        ISSUES=$((ISSUES + 1))
    fi
    
    if grep -q "except:" "$GUI_FILE"; then
        echo -e "${RED}✗ Found Python-style 'except:' in $GUI_FILE${NC}"
        ISSUES=$((ISSUES + 1))
    fi
    
    if grep -q "finally:" "$GUI_FILE"; then
        echo -e "${RED}✗ Found Python-style 'finally:' in $GUI_FILE${NC}"
        ISSUES=$((ISSUES + 1))
    fi
    
    if grep -q "async async" "$GUI_FILE"; then
        echo -e "${RED}✗ Found double 'async async' in $GUI_FILE${NC}"
        ISSUES=$((ISSUES + 1))
    fi
    
    if [ $ISSUES -eq 0 ]; then
        echo -e "${GREEN}✓ No Python syntax found${NC}"
    else
        echo ""
        echo -e "${YELLOW}MANUAL FIX REQUIRED:${NC}"
        echo "  Edit $GUI_FILE and fix:"
        echo "    - Change 'try:' to 'try {'"
        echo "    - Change 'except:' to '} catch (e) {'"
        echo "    - Change 'finally:' to '} finally {'"
        echo "    - Remove duplicate 'async' keywords"
    fi
else
    echo -e "${YELLOW}⚠ Frontend GUI file not found${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FIX 3: Kill Processes on Ports"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for port in 8000 8787 8788 5173; do
    PID=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "Killing process on port $port (PID: $PID)"
        kill $PID 2>/dev/null || kill -9 $PID 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✓ Port $port cleared${NC}"
    else
        echo -e "${GREEN}✓ Port $port already free${NC}"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FIX 4: Install Python Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v pip3 &> /dev/null; then
    echo "Installing fastapi, uvicorn, httpx..."
    pip3 install fastapi uvicorn httpx --quiet --break-system-packages 2>/dev/null || pip3 install fastapi uvicorn httpx --quiet
    echo -e "${GREEN}✓ Python dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ pip3 not found - skipping${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FIX 5: Reinstall Frontend Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "frontend" ] && command -v npm &> /dev/null; then
    echo "Clearing frontend cache..."
    cd frontend
    rm -rf node_modules package-lock.json .vite 2>/dev/null || true
    
    echo "Reinstalling dependencies..."
    npm install --silent
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Frontend dependencies reinstalled${NC}"
    else
        echo -e "${RED}✗ npm install failed${NC}"
    fi
    cd ..
else
    echo -e "${YELLOW}⚠ Frontend directory not found or npm not installed${NC}"
fi

echo ""
echo "============================================"
echo "Emergency Fixes Complete"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Run: ./preflight_check.sh"
echo "  2. If all checks pass, run: ./start_all.sh"
echo "  3. If syntax errors remain, manually edit files listed above"
echo ""
