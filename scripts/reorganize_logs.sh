#!/bin/bash
# dynamic ROOT based on this script's location
SCRIPT_DIR="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

set -e

LOGS_
echo "🧹 Cleaning up logs directory..."

# Remove unnecessary files
echo "  Removing .DS_Store files..."
find "$LOGS_ROOT" -name ".DS_Store" -delete 2>/dev/null || true

echo "  Removing old archives..."
rm -f "$LOGS_ROOT/Archive.zip"
rm -rf "$LOGS_ROOT/Archive"

echo "  Removing duplicate root-level logs..."
rm -f "$LOGS_ROOT/backend.log"
rm -f "$LOGS_ROOT/bot.log"
rm -f "$LOGS_ROOT/frontend.log"
rm -f "$LOGS_ROOT/init.log"

echo "  Removing PID files..."
find "$LOGS_ROOT" -name "pid" -delete 2>/dev/null || true

echo ""
echo "📁 Creating clean log structure..."

# Create organized directory structure
mkdir -p "$LOGS_ROOT/backend"
mkdir -p "$LOGS_ROOT/frontend"
mkdir -p "$LOGS_ROOT/bot"
mkdir -p "$LOGS_ROOT/epoke"
mkdir -p "$LOGS_ROOT/viewer"
mkdir -p "$LOGS_ROOT/decisions"

echo ""
echo "🗑️  Removing old log contents (keeping structure)..."

# Clear old logs but keep the directories
find "$LOGS_ROOT/backend" -type f -delete 2>/dev/null || true
find "$LOGS_ROOT/frontend" -type f -delete 2>/dev/null || true
find "$LOGS_ROOT/bot" -type f -delete 2>/dev/null || true
find "$LOGS_ROOT/epoke" -type f -delete 2>/dev/null || true
find "$LOGS_ROOT/viewer" -type f -delete 2>/dev/null || true

# Clean up old epoke-svc directory (replaced by epoke)
rm -rf "$LOGS_ROOT/epoke-svc" 2>/dev/null || true

echo ""
echo "📝 Creating fresh log files..."

# Create empty log files with proper structure
touch "$LOGS_ROOT/backend/backend.log"
touch "$LOGS_ROOT/backend/backend.err.log"
touch "$LOGS_ROOT/frontend/frontend.log"
touch "$LOGS_ROOT/frontend/frontend.err.log"
touch "$LOGS_ROOT/bot/bot.log"
touch "$LOGS_ROOT/epoke/epoke.log"
touch "$LOGS_ROOT/epoke/epoke.err.log"
touch "$LOGS_ROOT/viewer/viewer.log"
touch "$LOGS_ROOT/viewer/viewer.err.log"
touch "$LOGS_ROOT/decisions/decisions.jsonl"

# Create a README
cat > "$LOGS_ROOT/README.md" << 'READMEEOF'
# FoulPlay Logs Directory

## Structure
```
logs/
├── backend/           # Backend API logs
│   ├── backend.log        # Main backend output
│   └── backend.err.log    # Backend errors
├── frontend/          # Frontend Vite logs
│   ├── frontend.log       # Frontend output
│   └── frontend.err.log   # Frontend errors
├── bot/              # Bot battle logs
│   └── bot.log           # All bot activity
├── epoke/            # EPoké service logs
│   ├── epoke.log         # EPoké output
│   └── epoke.err.log     # EPoké errors
├── viewer/           # PocketMon viewer logs (optional)
│   ├── viewer.log        # Viewer output
│   └── viewer.err.log    # Viewer errors
└── decisions/        # AI decision logs
    └── decisions.jsonl   # Pattern #3 decision tracking
```

## Log Files Explained

### Backend Logs
- `backend/backend.log` - All API requests, status updates
- `backend/backend.err.log` - Errors, warnings, startup issues

### Frontend Logs
- `frontend/frontend.log` - Vite dev server output
- `frontend/frontend.err.log` - Build errors, React errors

### Bot Logs
- `bot/bot.log` - Battle activity, move selections, wins/losses

### EPoké Logs
- `epoke/epoke.log` - Move inference requests and responses
- `epoke/epoke.err.log` - EPoké service errors

### Decision Logs
- `decisions/decisions.jsonl` - AI decisions in JSON Lines format
  - One JSON object per line
  - Tracks MCTS, EPoké, and hybrid decisions

## Useful Commands
```bash
# Watch logs in real-time
tail -f logs/backend/backend.log
tail -f logs/bot/bot.log
tail -f logs/decisions/decisions.jsonl

# Search for errors
grep -i error logs/backend/backend.log
grep -i "keyerror" logs/bot/bot.log

# Count wins vs losses
grep -c "won" logs/bot/bot.log
grep -c "lost" logs/bot/bot.log

# View latest AI decisions
tail -20 logs/decisions/decisions.jsonl | jq .

# Clear all logs (fresh start)
find logs/ -name "*.log" -exec truncate -s 0 {} \;
find logs/ -name "*.jsonl" -exec truncate -s 0 {} \;
```

## Log Rotation

Old logs are not automatically deleted. To clean up:
```bash
# Archive logs older than 7 days
find logs/ -name "*.log" -mtime +7 -exec gzip {} \;

# Delete archived logs older than 30 days
find logs/ -name "*.gz" -mtime +30 -delete
```
READMEEOF

echo ""
echo "✅ Log directory reorganized!"
echo ""
echo "📊 New structure:"
tree -L 2 "$LOGS_ROOT" 2>/dev/null || ls -la "$LOGS_ROOT"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Logs folder cleaned and reorganized"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Log structure:"
echo "  logs/backend/     - Backend API logs"
echo "  logs/frontend/    - Frontend Vite logs"
echo "  logs/bot/         - Bot battle logs"
echo "  logs/epoke/       - EPoké service logs"
echo "  logs/decisions/   - AI decision tracking"
echo ""
echo "📖 Read logs/README.md for more info"
echo ""
