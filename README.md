# FoulPlay V6.5

FoulPlay is a **Pokémon Showdown** bot with a modern control plane:
- **Frontend (React + Vite)** at **5173** to configure and monitor runs
- **Backend (FastAPI)** at **8000** that launches/stops the bot and exposes logs/health
- **PKMN Service** (damage calc + data) at **8787**
- **EPoké ML Service** (fast move suggestions, optional) at **8788**
- **Bot (Python)** that connects to Showdown, plays battles, and streams decisions

## What V6.5 Can Do (end‑to‑end)

- ✅ Launch/stop the bot from the UI (Start/Stop) with live status
- ✅ Play **one battle at a time** (configurable caps exist but default to single battle)
- ✅ Show **service status**: PKMN & EPoké ONLINE/OFFLINE indicators
- ✅ Provide **Pokédex Lookup** and **Damage Calculator** (through PKMN service)
- ✅ Stream **logs** (backend/bot) into the UI (compat route `/logs/backend` supported)
- ✅ Record **decision traces** (last decision JSON) for post‑mortem debugging
- ✅ Adjustable performance knobs (think time, parallelism) when enabled
- ✅ Clean logs directory structure (kept in repo via `.gitkeep`, real logs ignored)
- ✅ Strict environment separation: secrets only in `.env` (never in Git)
- ✅ One‑paste start workflow via `./scripts/start_all.sh`

> EPoké suggestions are optional. If EPoké is offline, the bot still runs using its regular evaluation strategy.

## Architecture

```
frontend (5173)  →  backend (8000)  →  bot (Python) → Showdown
                        │
                        ├─→ pkmn-svc (8787)  — damage calc, data
                        └─→ epoke-svc (8788) — ML inference (optional)
```

- **Frontend**: React/Vite UI with tabs: Quick Start, Live Battle, Settings, Performance, Advanced, Logs & Stats.
- **Backend**: FastAPI app (Uvicorn). Launches/kills the bot process, tails logs, exposes health, routes requests.
- **Bot**: Python async runner that connects to Showdown websockets, parses state, chooses moves, and logs decisions.
- **PKMN Service**: Node/Express service used for move data, damage calcs, dex queries.
- **EPoké Service**: Node/Express wrapper that serves a lightweight model for quick move ranking.
- **Logs**: Stored at runtime under `logs/` (ignored by Git). The UI hits `/logs/backend` for compatibility tailing.

## Ports

- Frontend: **5173**
- Backend: **8000**
- PKMN: **8787**
- EPoké: **8788** (standardized in V6.5)

## Setup

1) Create envs
```bash
cp config/.env.example config/.env
cp backend/.env.example backend/.env
```

2) Python
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3) Node
```bash
(cd services/pkmn-svc && npm install)
(cd services/epoke-svc && npm install)
(cd frontend && npm install)
```

4) Start
```bash
./scripts/start_all.sh
```

Open the UI: http://localhost:5173

## Logs & Files

- `logs/backend/`, `logs/bot/`, `logs/frontend/`, `logs/services/pkmn-svc/`, `logs/services/epoke-svc/`, `logs/decisions/`
- Real logs are **not** committed. We keep `.gitkeep` placeholders so the structure is visible in Git.

## Troubleshooting (fast)

- **Start button does nothing** → Check backend logs. Most common cause: an ImportError in the bot (fixed in V6.5).
- **EPoké shows OFFLINE** → Confirm port **8788** on service + backend + bot; restart services.
- **Logs panel 404** → Ensure backend exposes `/logs/backend` compatibility endpoint.
- **Ports busy** → Run `./scripts/stop_all.sh` then retry.
- **Fresh clone works?** → Yes: that’s a requirement. If a clone fails to run after these steps, report in the Mistake Ledger.

## Roadmap (post‑V6.5)

- Rich decision overlays in the UI (top‑k move reasons)
- Built‑in replay viewer integration
- CI checks to prevent secrets and generated files entering Git
- Option to run EPoké remotely

## Security

- **Never** commit `.env` or credentials to Git
- Change your Showdown password if it was ever pushed to GitHub
- Use `.env.example` templates for safe sharing

## License

Private / Internal. Do not redistribute.
