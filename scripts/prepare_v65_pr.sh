#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
test -d "$ROOT/frontend" || { echo "run from repo root"; exit 1; }

BRANCH="v65-pr-fixes"

git checkout -b "$BRANCH" || git checkout "$BRANCH"

if [ -f "frontend/src/tabs/FoulPlayGUI.jsx" ]; then
  perl -0777 -i -pe 's/const\s+endpoints\s*=\s*\[\s*`\$\{API_BASE\}\/start`\s*,\s*`\$\{API_BASE\}\/start`\s*\];/const endpoints = [`${API_BASE}\/start`];/g' frontend/src/tabs/FoulPlayGUI.jsx || true
fi

for f in requirements.txt foul-play/requirements.txt; do
  if [ -f "$f" ]; then
    if grep -qE '^websockets==[0-9]+' "$f"; then
      perl -0777 -i -pe 's/^websockets==[0-9.]+$/websockets==14.1/m' "$f" || true
    else
      echo 'websockets==14.1' >> "$f"
    fi
    perl -0777 -i -pe 's/^poke-engine==[^\s\r\n]+.*$/poke-engine==0.0.46/m' "$f" || true
  fi
done

if [ ! -f ".gitignore" ]; then touch .gitignore; fi
grep -qxF '.venv/' .gitignore || echo '.venv/' >> .gitignore
grep -qxF 'node_modules/' .gitignore || echo 'node_modules/' >> .gitignore
grep -qxF 'logs/' .gitignore || echo 'logs/' >> .gitignore
grep -qxF '__pycache__/' .gitignore || echo '__pycache__/' >> .gitignore
grep -qxF '*.pyc' .gitignore || echo '*.pyc' >> .gitignore
grep -qxF '.DS_Store' .gitignore || echo '.DS_Store' >> .gitignore
grep -qxF 'backend/.env' .gitignore || echo 'backend/.env' >> .gitignore
grep -qxF 'frontend/.env' .gitignore || echo 'frontend/.env' >> .gitignore
grep -qxF 'config/.env' .gitignore || echo 'config/.env' >> .gitignore

mkdir -p scripts
cat > scripts/install_poke_engine.sh <<'EOI'
#!/usr/bin/env bash
set -euo pipefail
. .venv/bin/activate
pip install "poke-engine==0.0.46" --config-settings=build-args="--features poke-engine/terastallization --no-default-features" || pip install "poke-engine==0.0.46"
python - <<'PY'
import importlib, sys
try:
    importlib.import_module("poke_engine")
    print("poke_engine: OK")
except Exception as e:
    print("poke_engine: FAIL", e)
    sys.exit(1)
PY
EOI
chmod +x scripts/install_poke_engine.sh

cat > scripts/start_all.sh <<'EOX'
#!/usr/bin/env bash
set -euo pipefail
. .venv/bin/activate
mkdir -p logs/backend logs/frontend logs/services/epoke-svc logs/services/pkmn-svc
if [ -f "services/pkmn-svc/dist/index.js" ]; then node services/pkmn-svc/dist/index.js > logs/services/pkmn-svc/out.log 2>&1 & echo $! > logs/services/pkmn-svc/pid; fi
if [ -f "services/epoke-svc/src/index.ts" ]; then npx tsx services/epoke-svc/src/index.ts > logs/services/epoke-svc/out.log 2>&1 & echo $! > logs/services/epoke-svc/pid || true; fi
uvicorn backend.main:app --host 127.0.0.1 --port 8000 > logs/backend/backend.out 2> logs/backend/backend.err & echo $! > logs/backend/pid
( cd frontend && VITE_API_BASE=http://localhost:8000 npm run dev > ../logs/frontend/frontend.out 2>&1 & echo $! > ../logs/frontend/pid )
sleep 2
curl -fsS http://127.0.0.1:8000/health >/dev/null 2>&1 && echo "Backend http://localhost:8000 [OK]" || echo "Backend http://localhost:8000 [FAIL]"
curl -fsS http://127.0.0.1:5173 >/dev/null 2>&1 && echo "Frontend http://localhost:5173 [OK]" || echo "Frontend http://localhost:5173 [FAIL]"
curl -fsS http://127.0.0.1:8000/epoke/health >/dev/null 2>&1 && echo "EPoke   http://localhost:8788 [OK]" || echo "EPoke   http://localhost:8788 [FAIL]"
curl -fsS http://127.0.0.1:8000/pkmn/health >/dev/null 2>&1 && echo "PKMN    http://localhost:8787 [OK]" || echo "PKMN    http://localhost:8787 [FAIL]"
EOX
chmod +x scripts/start_all.sh

git add -A
git commit -m "V6.5 stability: fix Start call, pin websockets 14.1, safe poke-engine install script, EPoké optional start, tighten .gitignore"
git push -u origin "$BRANCH"
echo "PR branch pushed: $BRANCH"
