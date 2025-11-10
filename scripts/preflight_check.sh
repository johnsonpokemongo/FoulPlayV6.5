#!/bin/bash
# dynamic ROOT based on this script's location
SCRIPT_DIR="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo "============================================"
echo "FoulPlay V6.5 Pre-Flight Check"
echo "============================================"
echo ""

check_file() {
    local file=$1
    local name=$2
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗ FAIL${NC} - Missing: $name ($file)"
        ERRORS=$((ERRORS + 1))
        return 1
    else
        echo -e "${GREEN}✓ OK${NC}   - Found: $name"
        return 0
    fi
}

check_syntax() {
    local file=$1
    local name=$2
    local pattern=$3
    local description=$4
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${RED}✗ FAIL${NC} - $name: $description"
        echo -e "       ${YELLOW}Found:${NC} $(grep -n "$pattern" "$file" | head -1)"
        ERRORS=$((ERRORS + 1))
        return 1
    else
        echo -e "${GREEN}✓ OK${NC}   - $name: No $description"
        return 0
    fi
}

check_port() {
    local port=$1
    local name=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠ WARN${NC} - Port $port already in use (may conflict with $name)"
        WARNINGS=$((WARNINGS + 1))
        return 1
    else
        echo -e "${GREEN}✓ OK${NC}   - Port $port available for $name"
        return 0
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Checking File Structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "backend/main.py" "Backend main"
check_file "foul-play/run.py" "Bot runner"
check_file "foul-play/config.py" "Bot config"
check_file "frontend/src/App.jsx" "Frontend App" || check_file "frontend/src/FoulPlayGUI.jsx" "Frontend GUI"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Checking Frontend Syntax (Common Errors)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GUI_FILE=""
if [ -f "frontend/src/FoulPlayGUI.jsx" ]; then
    GUI_FILE="frontend/src/FoulPlayGUI.jsx"
elif [ -f "frontend/src/App.jsx" ]; then
    GUI_FILE="frontend/src/App.jsx"
fi

if [ -n "$GUI_FILE" ]; then
    check_syntax "$GUI_FILE" "Frontend" "try:" "Python-style try: (should be try {)"
    check_syntax "$GUI_FILE" "Frontend" "except:" "Python-style except: (should be catch)"
    check_syntax "$GUI_FILE" "Frontend" "finally:" "Python-style finally: (should be finally {)"
    check_syntax "$GUI_FILE" "Frontend" "async async" "Double async keyword"
    check_syntax "$GUI_FILE" "Frontend" "{ \\.payload" "Invalid object spread { .payload (should be ...payload)"
    
    if ! grep -q "const \[error, setError\]" "$GUI_FILE" 2>/dev/null; then
        echo -e "${YELLOW}⚠ WARN${NC} - Frontend: Using setError without useState declaration"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✓ OK${NC}   - Frontend: useState(error) declared"
    fi
else
    echo -e "${YELLOW}⚠ WARN${NC} - Frontend: Could not locate main GUI file"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Checking Port Availability"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_port 8000 "Backend"
check_port 8787 "PKMN Service"
check_port 8788 "EPoké Service"
check_port 5173 "Frontend (Vite)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Checking Python Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v python3 &> /dev/null; then
    echo -e "${GREEN}✓ OK${NC}   - Python 3 installed"
    
    if python3 -c "import fastapi" 2>/dev/null; then
        echo -e "${GREEN}✓ OK${NC}   - fastapi installed"
    else
        echo -e "${RED}✗ FAIL${NC} - fastapi not installed (run: pip install fastapi)"
        ERRORS=$((ERRORS + 1))
    fi
    
    if python3 -c "import uvicorn" 2>/dev/null; then
        echo -e "${GREEN}✓ OK${NC}   - uvicorn installed"
    else
        echo -e "${RED}✗ FAIL${NC} - uvicorn not installed (run: pip install uvicorn)"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗ FAIL${NC} - Python 3 not found"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Checking Node.js & Frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v node &> /dev/null; then
    echo -e "${GREEN}✓ OK${NC}   - Node.js installed ($(node --version))"
    
    if [ -d "frontend/node_modules" ]; then
        echo -e "${GREEN}✓ OK${NC}   - Frontend dependencies installed"
    else
        echo -e "${YELLOW}⚠ WARN${NC} - Frontend node_modules missing (run: cd frontend && npm install)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗ FAIL${NC} - Node.js not found"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "============================================"
echo "Pre-Flight Summary"
echo "============================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
    echo ""
    echo "You can now run: ./start_all.sh"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS WARNING(S)${NC}"
    echo ""
    echo "System should work, but check warnings above."
    echo "You can run: ./start_all.sh"
    exit 0
else
    echo -e "${RED}✗ $ERRORS ERROR(S), $WARNINGS WARNING(S)${NC}"
    echo ""
    echo "Fix errors above before starting services."
    echo ""
    echo "Quick fixes:"
    echo "  - Missing dependencies: pip install fastapi uvicorn httpx"
    echo "  - Frontend issues: cd frontend && npm install"
    echo "  - Syntax errors: Check files listed above"
    exit 1
fi
