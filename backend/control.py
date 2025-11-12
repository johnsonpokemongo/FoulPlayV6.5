from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse, JSONResponse
from pydantic import BaseModel, Field
from pathlib import Path
from collections import deque
from typing import Optional
import subprocess, sys, os, signal

router = APIRouter()

for p in ["logs","logs/backend","logs/bot","logs/frontend","logs/decisions","logs/services/epoke-svc","logs/services/pkmn-svc"]:
    Path(p).mkdir(parents=True, exist_ok=True)

BOT_PROC = None

class StartRequest(BaseModel):
    ps_username: Optional[str] = Field(default=None, alias="ps_username")
    ps_password: Optional[str] = Field(default=None, alias="ps_password")
    pokemon_format: str = Field(default="gen9randombattle", alias="pokemon_format")
    websocket_uri: str = Field(default="wss://sim3.psim.us/showdown/websocket", alias="websocket_uri")
    search_time_ms: int = Field(default=800, alias="search_time_ms")
    search_parallelism: int = Field(default=1, alias="search_parallelism")
    run_count: int = Field(default=1, alias="run_count")
    epoke_timeout_ms: int = Field(default=900, alias="epoke_timeout_ms")
    decision_deadline_ms: int = Field(default=5000, alias="decision_deadline_ms")

def _detect_bot_entry() -> str:
    for p in ("foul-play/run.py","foul-play/fp/run_battle.py"):
        if Path(p).exists():
            return p
    raise FileNotFoundError("bot entry script not found")

def _tail(path: str, n: int) -> str:
    try:
        with open(path, "r", errors="ignore") as f:
            return "".join(deque(f, maxlen=n))
    except FileNotFoundError:
        return ""

@router.get("/health")
def health():
    running = BOT_PROC is not None and BOT_PROC.poll() is None
    return {"ok": True, "bot_running": running}

@router.post("/start")
def start(req: StartRequest):
    global BOT_PROC
    if BOT_PROC is not None and BOT_PROC.poll() is None:
        raise HTTPException(status_code=409, detail="bot_already_running")
    entry = _detect_bot_entry()
    cmd = [
        sys.executable, "-u", entry,
        "--websocket-uri", req.websocket_uri,
        "--ps-username", req.ps_username or "",
        "--ps-password", req.ps_password or "",
        "--bot-mode", "search_ladder",
        "--pokemon-format", req.pokemon_format,
        "--search-time-ms", str(req.search_time_ms),
        "--search-parallelism", str(req.search_parallelism),
        "--run-count", str(req.run_count),
        "--log-level", "DEBUG",
        "--log-to-file",
    ]
    Path("logs/bot").mkdir(parents=True, exist_ok=True)
    bot_log = open("logs/bot/bot.log", "a")
    BOT_PROC = subprocess.Popen(cmd, stdout=bot_log, stderr=subprocess.STDOUT)
    return {"started": True, "pid": BOT_PROC.pid}

@router.post("/stop")
def stop():
    global BOT_PROC
    if BOT_PROC is None or BOT_PROC.poll() is not None:
        return {"stopped": True, "was_running": False}
    try:
        os.kill(BOT_PROC.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    return {"stopped": True, "was_running": True}

@router.get("/logs/{name}/tail", response_class=PlainTextResponse)
def logs_tail(name: str, n: int = 200):
    mapping = {
        "backend": "logs/backend/backend.log",
        "bot": "logs/bot/bot.log",
        "frontend": "logs/frontend/frontend.log",
        "decisions": "logs/decisions/decisions.log",
    }
    path = mapping.get(name)
    if not path:
        raise HTTPException(status_code=404, detail="unknown_log")
    return _tail(path, n)

@router.get("/logs/backend", response_class=PlainTextResponse)
def logs_backend(n: int = 200):
    return _tail("logs/backend/backend.log", n)
