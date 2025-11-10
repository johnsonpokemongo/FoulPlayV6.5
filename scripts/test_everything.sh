#!/bin/bash
# dynamic ROOT based on this script's location
SCRIPT_DIR="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

echo "🧪 Testing FoulPlay Installation"
echo "================================"
echo ""

cd ~/Desktop/FoulPlayV6.4

# Test 1: File existence
echo "📁 Test 1: Checking files exist..."
FILES=(
    "foul-play/fp/run_battle.py"
    "foul-play/fp/chat_guard.py"
    "foul-play/fp/epoke_client.py"
    "foul-play/fp/decision_logger.py"
    "foul-play/fp/websocket_client.py"
)

for f in "${FILES[@]}"; do
    if [ -f "$f" ]; then
        echo "  ✅ $f"
    else
        echo "  ❌ $f MISSING"
    fi
done

echo ""

# Test 2: Syntax check
echo "🔍 Test 2: Checking Python syntax..."
python3 -m py_compile foul-play/fp/run_battle.py && echo "  ✅ run_battle.py" || echo "  ❌ run_battle.py has errors"
python3 -m py_compile foul-play/fp/chat_guard.py && echo "  ✅ chat_guard.py" || echo "  ❌ chat_guard.py has errors"
python3 -m py_compile foul-play/fp/websocket_client.py && echo "  ✅ websocket_client.py" || echo "  ❌ websocket_client.py has errors"

echo ""

# Test 3: Services running
echo "🚀 Test 3: Checking services..."
if lsof -ti tcp:8000 > /dev/null 2>&1; then
    echo "  ✅ Backend running (port 8000)"
else
    echo "  ❌ Backend NOT running"
fi

if lsof -ti tcp:5173 > /dev/null 2>&1; then
    echo "  ✅ Frontend running (port 5173)"
else
    echo "  ❌ Frontend NOT running"
fi

if lsof -ti tcp:8787 > /dev/null 2>&1; then
    echo "  ✅ EPoké running (port 8787)"
else
    echo "  ❌ EPoké NOT running"
fi

echo ""

# Test 4: Health endpoints
echo "💊 Test 4: Checking health endpoints..."
if curl -s http://localhost:8000/health | grep -q '"ok":true'; then
    echo "  ✅ Backend health OK"
else
    echo "  ❌ Backend health FAILED"
fi

if curl -s http://localhost:8000/epoke/health | grep -q '"ok":true'; then
    echo "  ✅ EPoké health OK"
else
    echo "  ❌ EPoké health FAILED"
fi

echo ""

# Test 5: Log directories
echo "📝 Test 5: Checking log directories..."
LOGDIRS=("logs/backend" "logs/frontend" "logs/bot" "logs/epoke" "logs/decisions")
for d in "${LOGDIRS[@]}"; do
    if [ -d "$d" ]; then
        echo "  ✅ $d"
    else
        echo "  ❌ $d MISSING"
    fi
done

echo ""
echo "================================"
echo "✅ Testing complete!"
echo ""
echo "Next steps:"
echo "  1. Open http://localhost:5173"
echo "  2. Go to Quick Start tab"
echo "  3. Start a battle"
echo "  4. Watch: tail -f logs/bot/bot.log"
echo ""
