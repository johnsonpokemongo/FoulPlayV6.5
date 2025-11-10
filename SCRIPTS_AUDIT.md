# Scripts Audit (V6.5)

## What changed
- Removed hard‑coded Desktop paths from:
  - `scripts/start_backend.sh`
  - `scripts/start_epoke.sh`
  - `scripts/reorganize_logs.sh`
- All scripts now compute `ROOT` from their own location:

  ```bash
  SCRIPT_DIR="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
  ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
  ```

- This means you can move/rename the project folder without breaking the scripts.

## Expected scripts present
- `scripts/start_all.sh` – start backend, pkmn‑svc, epoke‑svc, frontend
- `scripts/stop_all.sh` – stop all services cleanly
- `scripts/start_backend.sh` – launch FastAPI (Uvicorn) and write logs to logs/backend/
- `scripts/start_epoke.sh` – launch epoke‑svc on **8788**
- `scripts/check_status.sh` – report health and PIDs
- `scripts/reorganize_logs.sh` – housekeeping for logs tree

## Alignment rules
- Ports are fixed: backend=8000, pkmn=8787, epoke=8788, frontend=5173
- Logs go under `logs/` (repo keeps only `.gitkeep` placeholders)
- No absolute paths allowed
- Any new script must respect the same dynamic ROOT convention
