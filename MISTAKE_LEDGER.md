MISTAKE LEDGER (FoulPlay V6.4 → V6.5 hardening)
- Assumed dist/index.js existed.
- Changed scripts before verifying build outputs.
- Didn’t lock Node to LTS first.
- Sent commands without asking when the entry path was unclear.
- Risky package.json mutation once.
- Offered multiple options instead of one clear path.
- Skipped initial diagnostics.
- Violated “no comments / one-paste” rule in terminal blocks.
- Treated 200 responses as health without proving port/body.
- Let smoke script keep node dist/index.js too long.
- Didn’t kill 7001 before restarts.
- Didn’t hard-kill 8000 before restart.
- Assumed EPoké honored PORT.
- Mixed up 8788 vs 7001 for EPoké.
- Delayed committing to a single working path.
- Didn’t update the smoke test early enough.
- Missed uvicorn reloader PID behavior.
- Used a kill that didn’t always free 8000.
- Collapsed multiple PIDs into one token in a kill sequence.
- Didn’t persist env reliably for reloads.
- Assumed backend read EPOKE_SVC_URL when it wasn’t wired yet.
- Didn’t proxy 8788 via backend quickly when needed.
- Referred to adapters/index.ts after src/index.ts.
- Omitted a cd "$ROOT" in one script.
- Missed PYTHONPATH="$ROOT" once for uvicorn import path.
- Assumed OpenAPI had requestBody; it didn’t.
- Claimed UI wasn’t sending fields before proving with /status.
- Suggested manual /start before confirming UI payload path.
- Included #comments in terminal blocks.
- Proposed terminal starts while UI-only start was required.
Fixed in this patch:
- Standardized EPoké base URL and port.
- Proxy-only EPoké access.
- Removed viewer collisions.
- Idempotent start/stop/status scripts.
- Single start path: UI button only.

## 2025-11-10 (V6.5 cleanup pass)

- Duplicate zip confusion: two archives named "FoulPlayV6.5" existed; one still contained a V6.4 tree and runtime logs. Resolved by standardizing on the clean "FoulPlayV6.5" bundle only.
- Logs in Git: removed runtime logs from version control by keeping only the folder structure with `.gitkeep` files. Rationale: logs are generated artifacts and bloat the repo; they belong in .gitignore.
- Hard‑coded Desktop paths in scripts: replaced with dynamic `ROOT` resolution based on the script's location to prevent path breakage when moving the project.
- EPoké port mismatch: standardized the default port to `8788` across service, backend, and bot.
- Bot import mismatch: `async_update_battle` imported but not implemented; imports now use `process_battle_updates` only.
- Frontend logs endpoint mismatch: frontend calls `/logs/backend`; backend exposes a compatibility handler to serve the same content.
- Repo hygiene: added a comprehensive `.gitignore` and moved real secrets into untracked `.env` files; provided `.env.example` templates.
