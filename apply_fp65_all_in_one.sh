#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d_%H%M%S)"
ROOT="$(pwd)"

mkdir -p "backups/$TS" logs/backend logs/frontend logs/bot logs/services/epoke-svc logs/services/pkmn-svc scripts

backup() { [ -f "$1" ] && cp "$1" "backups/$TS/$(basename "$1")" || true; }

backup frontend/vite.config.ts
backup foul-play/data/pkmn_sets.py
backup foul-play/fp/battle_modifier.py
backup foul-play/fp/run_battle.py
backup backend/main.py
backup scripts/start_all.sh
backup scripts/stop_all.sh

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

mkdir -p foul-play/data/pkmn_sets
cat > foul-play/data/pkmn_sets.py <<'PY'
from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, Optional

_DATA_ROOT = Path(__file__).resolve().parent / "pkmn_sets"

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

cat > foul-play/data/pkmn_sets/gen9randombattle.json <<'JSON'
{ "metadata": {"format":"gen9randombattle"}, "sets": [] }
JSON
cat > foul-play/data/pkmn_sets/gen8randombattle.json <<'JSON'
{ "metadata": {"format":"gen8randombattle"}, "sets": [] }
JSON
cat > foul-play/data/pkmn_sets/gen7randombattle.json <<'JSON'
{ "metadata": {"format":"gen7randombattle"}, "sets": [] }
JSON

mkdir -p foul-play/fp
if [ -f foul-play/fp/battle_modifier.py ]; then
  if ! grep -q 'def process_battle_updates' foul-play/fp/battle_modifier.py; then
    printf '\n\ndef process_battle_updates(*args, **kwargs):\n    return None\n' >> foul-play/fp/battle_modifier.py
  fi
else
  cat > foul-play/fp/battle_modifier.py <<'PY'
def process_battle_updates(*args, **kwargs):
    return None
PY
fi

python - <<'PY'
from pathlib import Path
p = Path("foul-play/fp/run_battle.py")
if not p.exists():
    raise SystemExit(0)
s = p.read_text(encoding="utf-8", errors="ignore")
changed = False
if "RandomBattleTeamDatasets.load(" in s and "_rbts_load_safe(" not in s:
    s = s.replace("RandomBattleTeamDatasets.load(", "_rbts_load_safe(")
    changed = True
if "_rbts_load_safe(" not in s:
    inject = (
        "from data.pkmn_sets import RandomBattleTeamDatasets\n\n"
        "def _rbts_load_safe(fmt: str):\n"
        "    try:\n"
        "        return RandomBattleTeamDatasets.load(fmt)\n"
        "    except Exception:\n"
        "        return None\n"
    )
    lines = s.splitlines(True)
    idx = 0
    while idx < len(lines) and (lines[idx].lstrip().startswith("import") or lines[idx].lstrip().startswith("from")):
        idx += 1
    s = "".join(lines[:idx]) + inject + "".join(lines[idx:])
    changed = True
if changed:
    p.write_text(s, encoding="utf-8")
print("RUN_BATTLE_PATCHED" if changed else "RUN_BATTLE_OK")
PY

mkdir -p services/epoke-svc
cat > services/epoke-svc/package.json <<'JSON'
{
  "name": "epoke-svc",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "body-parser": "^1.20.3",
    "express": "^4.21.1"
  }
}
JSON

cat > services/epoke-svc/server.js <<'JS'
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json({ limit: '1mb' }));
app.get('/health', (req, res) => res.json({ ok: true, service: 'epoke', model: 'stub' }));
function scorePayload(body) {
  const moves = Array.isArray(body && body.moves) ? body.moves : [];
  const scores = moves.map(() => 0.5);
  return { ok: true, model: 'stub', scores };
}
app.post('/score', (req, res) => res.json(scorePayload(req.body)));
app.post('/evaluate', (req, res) => res.json(scorePayload(req.body)));
app.post('/predict', (req, res) => res.json(scorePayload(req.body)));
app.get('/', (req, res) => res.json({ ok: true, endpoints: ['/health','/score','/evaluate','/predict'] }));
const PORT = 8788;
app.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`epoke-svc listening on http://127.0.0.1:${PORT}\n`);
});
JS

cat > scripts/start_all.sh <<'SH2'
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p logs/backend logs/frontend logs/bot logs/services/epoke-svc logs/services/pkmn-svc

if [ -d ".venv" ]; then . ".venv/bin/activate" || true; fi
if ! grep -q '^python-dateutil' requirements.txt 2>/dev/null; then printf '\npython-dateutil==2.9.0.post0\n' >> requirements.txt; fi
pip install -r requirements.txt >/dev/null 2>&1 || true

nohup python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload > logs/backend/backend.log 2>&1 &
echo $! > logs/backend/pid

if [ -d "services/epoke-svc" ]; then
  cd services/epoke-svc
  npm install >/dev/null 2>&1 || true
  nohup npm run start > ../../logs/services/epoke-svc/epoke.log 2>&1 &
  echo $! > ../../logs/services/epoke-svc/pid
  cd "$ROOT"
fi

if [ -d "services/pkmn-svc" ]; then
  cd services/pkmn-svc
  if [ -f "package.json" ]; then
    npm install >/dev/null 2>&1 || true
    if npm run | grep -q '^ *start'; then
      nohup npm run start > ../../logs/services/pkmn-svc/pkmn.log 2>&1 &
      echo $! > ../../logs/services/pkmn-svc/pid
    elif [ -f "server.js" ]; then
      nohup node server.js > ../../logs/services/pkmn-svc/pkmn.log 2>&1 &
      echo $! > ../../logs/services/pkmn-svc/pid
    fi
  fi
  cd "$ROOT"
fi

cd frontend
npm install >/dev/null 2>&1 || true
nohup npm run dev -- --host --port 5173 > ../logs/frontend/frontend.log 2>&1 &
echo $! > ../logs/frontend/pid
cd "$ROOT"

sleep 2
curl -s http://127.0.0.1:8000/health || true
echo
curl -s http://127.0.0.1:8000/backend || true
echo
curl -s http://127.0.0.1:8788/health || true
echo
SH2
chmod +x scripts/start_all.sh

cat > scripts/stop_all.sh <<'SH3'
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

killport() { p=$(lsof -nti tcp:$1 -sTCP:LISTEN 2>/dev/null || true); [ -n "$p" ] && kill -9 $p || true; }

curl -s -X POST http://127.0.0.1:8000/stop >/dev/null 2>&1 || true

for f in logs/backend/pid logs/frontend/pid logs/services/epoke-svc/pid logs/services/pkmn-svc/pid; do
  [ -f "$f" ] && kill -9 $(cat "$f") 2>/dev/null || true
done

killport 8000
killport 5173
killport 8787
killport 8788

echo "Stopped."
SH3
chmod +x scripts/stop_all.sh

if [ -f ".venv/bin/activate" ]; then . ".venv/bin/activate"; fi
if [ -f "requirements.txt" ]; then pip install -r requirements.txt; fi

if ! pgrep -f 'uvicorn.*backend\.main:app' >/dev/null 2>&1; then
  nohup python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload > logs/backend/backend.log 2>&1 &
  sleep 2
fi

printf '\n' >> requirements.txt || true

printf 'OK\n'
