#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
TS="$(date +%Y%m%d_%H%M%S)"

say() { printf "[fp65] %s\n" "$*"; }
backup() { [ -f "$1" ] && mkdir -p "backups/$TS" && cp "$1" "backups/$TS/$(basename "$1")" || true; }
killport() { p=$(lsof -nti tcp:$1 -sTCP:LISTEN 2>/dev/null || true); [ -n "$p" ] && kill -9 $p || true; }

say "Stopping any old processes…"
for port in 8000 5173 8787 8788; do killport $port; done
pkill -f 'uvicorn.*backend\.main:app' 2>/dev/null || true
pkill -f 'node .*services/epoke-svc' 2>/dev/null || true

mkdir -p logs/backend logs/frontend logs/bot logs/services/epoke-svc logs/services/pkmn-svc scripts

# --- FRONTEND PROXY ---
backup frontend/vite.config.ts
mkdir -p frontend
cat > frontend/vite.config.ts <<'TS'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    proxy: {
      '^/(start|stop|status|logs|backend|config|decisions|room|state|epoke|pkmn)': 'http://127.0.0.1:8000'
    }
  }
})
TS

# --- EPOKÉ STUB (Node/Express) ---
mkdir -p services/epoke-svc
cat > services/epoke-svc/package.json <<'JSON'
{
  "name": "epoke-svc",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": { "body-parser": "^1.20.3", "express": "^4.21.1" }
}
JSON

cat > services/epoke-svc/server.js <<'JS'
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ ok: true, service: 'epoke', model: 'stub' }));

function score(body) {
  const moves = Array.isArray(body && body.moves) ? body.moves : [];
  return { ok: true, model: 'stub', scores: moves.map(() => 0.5) };
}

app.post('/score', (req, res) => res.json(score(req.body)));
app.post('/evaluate', (req, res) => res.json(score(req.body)));
app.post('/predict', (req, res) => res.json(score(req.body)));
app.get('/', (req, res) => res.json({ ok: true, endpoints: ['/health','/score','/evaluate','/predict'] }));

const PORT = 8788;
app.listen(PORT, '127.0.0.1', () => process.stdout.write(`epoke-svc listening on http://127.0.0.1:${PORT}\n`));
JS

# --- BOT DATASET + NO-OP battle_modifier ---
mkdir -p foul-play/data/pkmn_sets
cat > foul-play/data/pkmn_sets.py <<'PY'
from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, Optional

_DATA_ROOT = Path(__file__).resolve().parent

class RandomBattleTeamDatasets:
    _cache: Dict[str, Any] = {}

    @classmethod
    def load(cls, fmt: str) -> Optional[Any]:
        key = (fmt or "").strip().lower()
        if not key:
            return None
        if key in cls._cache:
            return cls._cache[key]
        name_map = {
            "gen9randombattle": "gen9randombattle.json",
            "gen8randombattle": "gen8randombattle.json",
            "gen7randombattle": "gen7randombattle.json",
        }
        fname = name_map.get(key)
        if not fname:
            return None
        fpath = _DATA_ROOT / fname
        if not fpath.exists():
            return None
        try:
            data = json.loads(fpath.read_text(encoding="utf-8"))
        except Exception:
            return None
        cls._cache[key] = data
        return data
PY

for F in gen9randombattle.json gen8randombattle.json gen7randombattle.json; do
  [ -f "foul-play/data/pkmn_sets/$F" ] || printf '{ "metadata": {"format":"%s"}, "sets": [] }\n' "${F%%.json}" > "foul-play/data/pkmn_sets/$F"
done

# Ensure process_battle_updates exists:
if [ -f foul-play/fp/battle_modifier.py ]; then
  grep -q 'def process_battle_updates' foul-play/fp/battle_modifier.py || \
    printf '\n\ndef process_battle_updates(*args, **kwargs):\n    return None\n' >> foul-play/fp/battle_modifier.py
else
  mkdir -p foul-play/fp
  cat > foul-play/fp/battle_modifier.py <<'PY'
def process_battle_updates(*args, **kwargs):
    return None
PY
fi

# Patch run_battle.py to use safe wrapper
python - <<'PY'
from pathlib import Path
rp = Path("foul-play/fp/run_battle.py")
if rp.exists():
    s = rp.read_text(encoding="utf-8", errors="ignore")
    inj = (
      "from data.pkmn_sets import RandomBattleTeamDatasets\n\n"
      "def _rbts_load_safe(fmt: str):\n"
      "    try:\n"
      "        return RandomBattleTeamDatasets.load(fmt)\n"
      "    except Exception:\n"
      "        return None\n"
    )
    if "_rbts_load_safe(" not in s:
        # insert after imports
        lines = s.splitlines(True)
        i = 0
        while i < len(lines) and (lines[i].lstrip().startswith(("import","from"))):
            i += 1
        s = "".join(lines[:i]) + inj + "".join(lines[i:])
    if "RandomBattleTeamDatasets.load(" in s:
        s = s.replace("RandomBattleTeamDatasets.load(", "_rbts_load_safe(")
    rp.write_text(s, encoding="utf-8")
    print("RUN_BATTLE_PATCHED")
else:
    print("RUN_BATTLE_MISSING")
PY

# --- BACKEND (full minimal FastAPI app with required endpoints) ---
backup backend/main.py
mkdir -p backend
cat > backend/main.py <<'PY'
from __future__ import annotations
import os, re, json, signal, subprocess
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[1]
LOGS = ROOT / "logs"
BOT_LOG = LOGS / "bot" / "bot.log"
BOT_PID = LOGS / "bot" / "pid"
LOGS.mkdir(parents=True, exist_ok=True)
(BOT_LOG.parent).mkdir(parents=True, exist_ok=True)

app = FastAPI(title="FoulPlay Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

class StartReq(BaseModel):
    ps_username: str
    ps_password: str
    pokemon_format: str = "gen9randombattle"
    search_time_ms: int = 800
    run_count: int = 1
    search_parallelism: int = 1
    bot_mode: str = "search_ladder"
    websocket_uri: Optional[str] = "wss://sim3.psim.us/showdown/websocket"

def _is_running(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except Exception:
        return False

def bot_pid() -> Optional[int]:
    try:
        return int(BOT_PID.read_text().strip())
    except Exception:
        return None

def tail(path: Path, n: int) -> List[str]:
    try:
        with path.open("rb") as f:
            f.seek(0, os.SEEK_END)
            end = f.tell()
            size = 8192
            data = b""
            while end > 0 and data.count(b"\n") <= n:
                start = max(0, end - size)
                f.seek(start)
                chunk = f.read(end - start)
                data = chunk + data
                end = start
            return data.decode("utf-8", errors="ignore").splitlines()[-n:]
    except Exception:
        return []

@app.get("/health")
def health(): return {"ok": True}

@app.get("/backend")
def backend_info(): return {"ok": True, "service": "backend"}

@app.get("/status")
def status():
    pid = bot_pid()
    return {"ok": True, "bot_running": bool(pid and _is_running(pid))}

@app.post("/start")
def start_bot(req: StartReq):
    # Stop any stale
    stop_bot()
    cmd = [
        "python","-u", str(ROOT / "foul-play" / "run.py"),
        "--websocket-uri", req.websocket_uri or "wss://sim3.psim.us/showdown/websocket",
        "--ps-username", req.ps_username, "--ps-password", req.ps_password,
        "--bot-mode", req.bot_mode,
        "--pokemon-format", req.pokemon_format,
        "--search-time-ms", str(req.search_time_ms),
        "--search-parallelism", str(req.search_parallelism),
        "--run-count", str(req.run_count),
        "--log-level", "DEBUG", "--log-to-file"
    ]
    BOT_LOG.parent.mkdir(parents=True, exist_ok=True)
    p = subprocess.Popen(cmd, cwd=str(ROOT), stdout=BOT_LOG.open("a"), stderr=subprocess.STDOUT)
    BOT_PID.write_text(str(p.pid))
    return {"started": True, "pid": p.pid}

@app.post("/stop")
def stop_bot():
    pid = bot_pid()
    if pid and _is_running(pid):
        try:
            os.kill(pid, signal.SIGTERM)
        except Exception:
            try: os.kill(pid, signal.SIGKILL)
            except Exception: pass
    BOT_PID.write_text("")
    return {"stopped": True}

@app.get("/logs/bot/tail")
def logs_bot_tail(n: int = Query(200, ge=1, le=5000)):
    return {"ok": True, "lines": tail(BOT_LOG, n)}

@app.get("/logs/backend/tail")
def logs_backend_tail(n: int = Query(200, ge=1, le=5000)):
    return {"ok": True, "lines": tail(LOGS / "backend" / "backend.log", n)}

@app.get("/logs/frontend/tail")
def logs_frontend_tail(n: int = Query(200, ge=1, le=5000)):
    return {"ok": True, "lines": tail(LOGS / "frontend" / "frontend.log", n)}
PY

# --- START / STOP scripts ---
cat > scripts/stop_all.sh <<'SH_STOP'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

killport(){ p=$(lsof -nti tcp:$1 -sTCP:LISTEN 2>/dev/null || true); [ -n "$p" ] && kill -9 $p || true; }

curl -s -X POST http://127.0.0.1:8000/stop >/dev/null 2>&1 || true
pkill -f 'uvicorn.*backend\.main:app' 2>/dev/null || true
pkill -f 'node .*services/epoke-svc' 2>/dev/null || true

for port in 8000 5173 8787 8788; do killport $port; done

echo "Stopped."
SH_STOP
chmod +x scripts/stop_all.sh

cat > scripts/start_all.sh <<'SH_START'
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
SH_START
chmod +x scripts/start_all.sh

# --- Final dependency touch ---
if [ -f ".venv/bin/activate" ]; then . ".venv/bin/activate"; fi
[ -f requirements.txt ] && pip install -r requirements.txt >/dev/null 2>&1 || true

say "Apply complete."
