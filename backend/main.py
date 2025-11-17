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
