import sys, os, pathlib
__FP_ROOT = pathlib.Path(__file__).resolve().parents[1]
p = str(__FP_ROOT)
os.environ.setdefault('PYTHONPATH', p)
sys.path.insert(0, p) if p not in sys.path else None
from fastapi.middleware.cors import CORSMiddleware

import sys, os, json, subprocess, time, logging, logging.config, re
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import asyncio
from fastapi.responses import StreamingResponse

sys.path.insert(0, str(Path(__file__).parent.parent / "foul-play"))

try:
    from fp.decision_logger import latest_decision, get_recent_decisions
    DECISION_LOGGER_AVAILABLE = True
except ImportError:
    logging.warning("decision_logger not found - decision display features disabled")
    DECISION_LOGGER_AVAILABLE = False
    def latest_decision():
        return None
    def get_recent_decisions(n=50):
        return []
from .epoke_client import health as _ep_h, infer as _ep_infer
from .battle_state_parser import BattleStateParser

app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=False, allow_methods=['*'], allow_headers=['*'])
HERE = Path(__file__).resolve()
ROOT = HERE.parents[1]
LOGS = ROOT / "logs"
LOGS.mkdir(parents=True, exist_ok=True)
LOGGING_INI = HERE.parent / "logging.ini"
if LOGGING_INI.exists():
    logging.config.fileConfig(LOGGING_INI, disable_existing_loggers=False)
else:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
log = logging.getLogger("backend")
RUNNER = ROOT / "foul-play" / "run.py"
CONFIG_DIR = ROOT / "config"
CONFIG_FILE = CONFIG_DIR / "config.json"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

STATE: Dict[str, Any] = {
    "running": False,
    "pid": None,
    "session_start": None,
    "config": None,
    "current_battle": {
        "room_id": None,
        "room_url": None,
        "opponent": None,
        "format": None,
        "turn": 0,
        "started_at": None
    }
}

PROC: Optional[subprocess.Popen] = None

RECOGNIZED_TO_FLAGS = [
    ("websocket_uri", "--websocket-uri"),
    ("ps_username", "--ps-username"),
    ("ps_password", "--ps-password"),
    ("ps_avatar", "--ps-avatar"),
    ("bot_mode", "--bot-mode"),
    ("user_to_challenge", "--user-to-challenge"),
    ("pokemon_format", "--pokemon-format"),
    ("smogon_stats_format", "--smogon-stats-format"),
    ("search_time_ms", "--search-time-ms"),
    ("search_parallelism", "--search-parallelism"),
    ("run_count", "--run-count"),
    ("team_name", "--team-name"),
    ("save_replay", "--save-replay"),
    ("room_name", "--room-name"),
    ("log_level", "--log-level"),
    ("epoke_timeout_ms", "--epoke-timeout-ms"),
    ("decision_deadline_ms", "--decision-deadline-ms"),
    ("max_concurrent_battles", "--max-concurrent-battles"),
]
BOOLEAN_FLAGS = [
    ("log_to_file", "--log-to-file"),
    ("enable_epoke", "--enable-epoke"),
    ("manual_decision_mode", "--manual-decision-mode"),
]
DEFAULTS: Dict[str, Any] = {
    "websocket_uri": "wss://sim3.psim.us/showdown/websocket",
    "ps_username": "",
    "ps_password": "",
    "bot_mode": "search_ladder",
    "pokemon_format": "gen9randombattle",
    "team_name": "",
    "search_time_ms": 900,
    "search_parallelism": 1,
    "run_count": 1,
    "save_replay": "on_loss",
    "log_level": "INFO",
    "log_to_file": True,
    "user_to_challenge": None,
    "ps_avatar": None,
    "smogon_stats_format": None,
    "room_name": None,
    "enable_epoke": True,
    "manual_decision_mode": False,
    "epoke_timeout_ms": 900,
    "decision_deadline_ms": 5000,
    "max_concurrent_battles": 1,
}

def _is_blank(v: Any) -> bool:
    return v is None or (isinstance(v, str) and v.strip() == "")

def mask_sensitive(cfg):
    out = dict(cfg or {})
    if "ps_password" in out and out["ps_password"]:
        out["ps_password"] = "****"
    return out

def load_saved_config() -> Dict[str, Any]:
    try:
        if CONFIG_FILE.exists():
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}

def save_config(data: Dict[str, Any]) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def build_cmd(cfg: Dict[str, Any]) -> List[str]:
    py = sys.executable
    venv_py = HERE.parent / ".venv" / "bin" / "python"
    if venv_py.exists():
        py = str(venv_py)
    cmd: List[str] = [py, "-u", str(RUNNER)]
    for key, flag in RECOGNIZED_TO_FLAGS:
        val = cfg.get(key, DEFAULTS.get(key))
        if key in ("ps_username","ps_password"):
            cmd.extend([flag, "" if val is None else str(val)])
            continue
        if _is_blank(val):
            continue
        cmd.extend([flag, str(val)])
    for key, flag in BOOLEAN_FLAGS:
        val = cfg.get(key, DEFAULTS.get(key))
        if bool(val):
            cmd.append(flag)
    return cmd

def is_running() -> bool:
    return PROC is not None and PROC.poll() is None

def stop_proc() -> None:
    global PROC
    if PROC is None:
        return
    try:
        if PROC.poll() is None:
            PROC.terminate()
            try:
                PROC.wait(timeout=5)
            except subprocess.TimeoutExpired:
                PROC.kill()
                PROC.wait()
    except Exception as e:
        log.warning(f"Error stopping process: {e}")
    finally:
        PROC = None
        STATE["running"] = False
        STATE["pid"] = None

def start_proc(cfg: Dict[str, Any]) -> None:
    global PROC
    stop_proc()
    cmd = build_cmd(cfg)
    log.info(f"Starting bot: {' '.join(cmd)}")
    
    env = os.environ.copy()
    env["ENABLE_EPOKE"] = "1" if cfg.get("enable_epoke", False) else "0"
    env["EPOKE_URL"] = "http://127.0.0.1:8788/infer"
    env["PKMN_SVC_URL"] = "http://127.0.0.1:8787"
    env["EPOKE_TIMEOUT_MS"] = str(cfg.get("epoke_timeout_ms", 900))
    env["FP_LOG_DIR"] = str(LOGS)
    env["FP_MAX_CONCURRENT_BATTLES"] = str(cfg.get("max_concurrent_battles", 1))
    
    outf = (LOGS / "bot" / "bot.log").open("ab")
    try:
        errf = (LOGS / "bot" / "bot.err.log").open("ab")
    except Exception:
        errf = outf
    
    PROC = subprocess.Popen(cmd, stdout=outf, stderr=errf, env=env)
    STATE["running"] = True
    STATE["pid"] = PROC.pid
    STATE["session_start"] = datetime.now().isoformat()
    STATE["config"] = cfg
    save_config(cfg)
    log.info(f"Bot started with PID {PROC.pid}")

@app.get("/health")
def health():
    return {"ok": True, "runner_exists": RUNNER.exists()}

@app.get("/status")
def status():
    return {
        "running": is_running(),
        "pid": STATE["pid"],
        "session_start": STATE["session_start"],
        "config": mask_sensitive(STATE.get("config")),
        "current_battle": STATE.get("current_battle", {}),
        "decision_logger_available": DECISION_LOGGER_AVAILABLE
    }

@app.post("/start")
async def start(req: Request):
    if is_running():
        return JSONResponse({"error": "Already running"}, status_code=409)
    try:
        data = await req.json()
        start_proc(data)
        return {"ok": True, "pid": STATE["pid"]}
    except Exception as e:
        log.exception("Failed to start bot")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/stop")
def stop():
    stop_proc()
    return {"ok": True}

@app.get("/config")
def get_config():
    saved = load_saved_config()
    merged = {**DEFAULTS, **saved}
    return mask_sensitive(merged)

@app.post("/config")
async def set_config(req: Request):
    try:
        data = await req.json()
        save_config(data)
        return {"ok": True}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)

@app.get("/stats")
def get_stats():
    """Parse bot.log for wins/losses statistics"""
    log_file = LOGS / "bot" / "bot.log"
    wins = losses = 0
    session_start = None
    
    if log_file.exists():
        pattern = re.compile(r'W:\s*(\d+)\s+L:\s*(\d+)')
        try:
            with open(log_file, 'r') as f:
                for line in f:
                    match = pattern.search(line)
                    if match:
                        wins = int(match.group(1))
                        losses = int(match.group(2))
        except Exception as e:
            log.error(f"Error parsing stats: {e}")
    
    total = wins + losses
    winrate = round((wins / total * 100), 1) if total > 0 else 0.0
    
    return {
        "session": {
            "wins": wins,
            "losses": losses,
            "total": total,
            "winrate": winrate,
            "start_time": STATE.get("session_start")
        },
        "alltime": {
            "wins": wins,
            "losses": losses,
            "total": total,
            "winrate": winrate
        }
    }

@app.get("/battle/history")
def get_battle_history(limit: int = 20):
    """Parse recent battles from bot.log"""
    log_file = LOGS / "bot" / "bot.log"
    battles = []
    
    if not log_file.exists():
        return {"battles": []}
    
    try:
        init_pattern = re.compile(r'Initialized\s+(battle-[^\s]+)\s+against:\s+(.+)')
        result_pattern = re.compile(r'(Won|Lost)\s+with\s+team:\s+(.+)')
        
        with open(log_file, 'r') as f:
            lines = f.readlines()[-1000:]
        
        current_battle = None
        for line in lines:
            init_match = init_pattern.search(line)
            if init_match:
                room_id = init_match.group(1)
                opponent = init_match.group(2).strip()
                format_match = re.search(r'battle-([^-]+)', room_id)
                battle_format = format_match.group(1) if format_match else "unknown"
                
                current_battle = {
                    "room_id": room_id,
                    "opponent": opponent,
                    "format": battle_format,
                    "result": None
                }
            
            result_match = result_pattern.search(line)
            if result_match and current_battle:
                result = result_match.group(1).lower()
                current_battle["result"] = result
                current_battle["win"] = (result == "won")
                battles.append(current_battle)
                current_battle = None
    
    except Exception as e:
        log.error(f"Error parsing battle history: {e}")
    
    return {"battles": battles[-limit:] if battles else []}

@app.get("/battle/room")
def get_battle_room():
    """Get current battle room info"""
    battle = STATE.get("current_battle", {})
    if battle.get("room_id"):
        return {
            "id": battle["room_id"],
            "url": battle.get("room_url"),
            "opponent": battle.get("opponent"),
            "format": battle.get("format")
        }
    return JSONResponse({"error": "No active battle"}, status_code=404)

@app.get("/decisions/latest")
def get_latest_decision():
    if not DECISION_LOGGER_AVAILABLE:
        return JSONResponse({"error": "Decision logger not available"}, status_code=503)
    decision = latest_decision()
    if decision:
        return decision
    return JSONResponse({"error": "No decisions logged yet"}, status_code=404)

@app.get("/decisions/recent")
def get_recent_decisions_route(n: int = 50):
    if not DECISION_LOGGER_AVAILABLE:
        return JSONResponse({"error": "Decision logger not available"}, status_code=503)
    decisions = get_recent_decisions(n)
    return {"decisions": decisions, "count": len(decisions)}

@app.get("/decisions/stream")
async def stream_decisions():
    if not DECISION_LOGGER_AVAILABLE:
        return JSONResponse({"error": "Decision logger not available"}, status_code=503)
    async def event_generator():
        last_ts = 0
        while True:
            try:
                decision = latest_decision()
                if decision and decision.get("ts", 0) > last_ts:
                    last_ts = decision["ts"]
                    yield f"data: {json.dumps(decision)}\n\n"
                await asyncio.sleep(0.5)
            except Exception as e:
                log.error(f"Error in decision stream: {e}")
                await asyncio.sleep(1)
    return StreamingResponse(event_generator(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})

@app.get("/battle/current")
def get_current_battle():
    bot_log = LOGS / "bot" / "bot.log"
    if not bot_log.exists():
        return JSONResponse({"error": "No battle log found"}, status_code=404)
    try:
        parser = BattleStateParser(bot_log)
        state = parser.parse_latest_battle_state()
        if state:
            return state
        return JSONResponse({"error": "No active battle"}, status_code=404)
    except Exception as e:
        log.error(f"Error parsing battle state: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

from .epoke_routes import router as epoke_router
app.include_router(epoke_router)
from .control_routes import router as control_router
app.include_router(control_router)
from .pkmn_proxy import router as pkmn_router
app.include_router(pkmn_router)

@app.get("/logs/{log_type}/stream")
async def stream_log(log_type: str):
    log_map = {"bot": LOGS / "bot" / "bot.log", "backend": LOGS / "backend" / "backend.log", "frontend": LOGS / "frontend" / "frontend.log", "epoke": LOGS / "epoke" / "epoke.log"}
    if log_type not in log_map:
        return JSONResponse({"error": "Invalid log type"}, status_code=400)
    log_file = log_map[log_type]
    async def log_generator():
        try:
            if not log_file.exists():
                yield f"data: {json.dumps({'error': 'Log file not found'})}\n\n"
                return
            with log_file.open("r") as f:
                f.seek(0, 2)
                while True:
                    line = f.readline()
                    if line:
                        yield f"data: {json.dumps({'line': line.rstrip()})}\n\n"
                    else:
                        await asyncio.sleep(0.1)
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    return StreamingResponse(log_generator(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})

@app.get("/logs/{log_type}/tail")
def tail_log(log_type: str, lines: int = 100):
    log_map = {"bot": LOGS / "bot" / "bot.log", "backend": LOGS / "backend" / "backend.log", "frontend": LOGS / "frontend" / "frontend.log", "epoke": LOGS / "epoke" / "epoke.log"}
    if log_type not in log_map:
        return JSONResponse({"error": "Invalid log type"}, status_code=400)
    log_file = log_map[log_type]
    if not log_file.exists():
        return {"lines": [], "file": str(log_file)}
    try:
        with log_file.open("r") as f:
            all_lines = f.readlines()
            tail_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
            return {"lines": [l.rstrip() for l in tail_lines], "file": str(log_file)}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/logs")
async def logs_compat(n: int = 100):
    """Compatibility endpoint for frontend - redirects to bot logs"""
    return tail_log("bot", n)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

@app.get("/backend")
async def backend_compat():
    return {"ok": True, "runner_exists": True}


@app.get("/battle/state")
async def battle_state():
    return {"room": None, "state": None}


@app.get("/room")
async def room_compat():
    return {"room": None}


@app.get("/state")
async def state_compat():
    return {"room": None, "state": None}


from fastapi import Response
from pathlib import Path

@app.get("/logs/backend")
async def logs_backend(n: int = 200):
    p = Path("logs/backend/backend.log")
    if not p.exists():
        return Response("", media_type="text/plain")
    lines = p.read_text(encoding="utf-8", errors="ignore").splitlines()
    return Response("\n".join(lines[-n:]), media_type="text/plain")

@app.get("/logs/bot")
async def logs_bot(n: int = 200):
    p = Path("logs/bot/bot.log")
    if not p.exists():
        return Response("", media_type="text/plain")
    lines = p.read_text(encoding="utf-8", errors="ignore").splitlines()
    return Response("\n".join(lines[-n:]), media_type="text/plain")
