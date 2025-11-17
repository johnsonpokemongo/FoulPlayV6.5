from fastapi import APIRouter, Response
from pydantic import BaseModel
import subprocess, pathlib, os, sys, signal, json

router = APIRouter()

class StartReq(BaseModel):
    ps_username: str
    ps_password: str
    pokemon_format: str = "gen9randombattle"
    search_time_ms: int = 800
    search_parallelism: int = 1
    run_count: int = 1

@router.post("/start")
def start(req: StartReq):
    pathlib.Path("logs/bot").mkdir(parents=True, exist_ok=True)
    env=os.environ.copy()
    env["PYTHONUNBUFFERED"]="1"
    env["PYTHONPATH"]=str(pathlib.Path.cwd())
    args=[sys.executable,"-u","foul-play/run.py","--websocket-uri","wss://sim3.psim.us/showdown/websocket","--ps-username",req.ps_username,"--ps-password",req.ps_password,"--bot-mode","search_ladder","--pokemon-format",req.pokemon_format,"--search-time-ms",str(req.search_time_ms),"--search-parallelism",str(req.search_parallelism),"--run-count",str(req.run_count),"--log-level","DEBUG","--log-to-file"]
    log=open("logs/bot/bot.log","a")
    p=subprocess.Popen(args, env=env, stdout=log, stderr=log)
    pathlib.Path("logs/bot/bot.pid").write_text(str(p.pid))
    return {"started": True, "pid": p.pid}

@router.post("/stop")
def stop():
    killed=0
    for pat in ["foul-play/run.py","foul-play/fp/run_battle.py"]:
        try:
            out=subprocess.check_output(["pgrep","-f",pat]).decode().strip().splitlines()
            for pid in out:
                os.kill(int(pid), signal.SIGTERM)
                killed+=1
        except Exception:
            pass
    try:
        pidf=pathlib.Path("logs/bot/bot.pid")
        if pidf.exists():
            pid=int(pidf.read_text().strip() or "0")
            if pid>0:
                os.kill(pid, signal.SIGTERM)
                killed+=1
            pidf.unlink(missing_ok=True)
    except Exception:
        pass
    return {"ok": True, "killed": killed}

@router.get("/logs/bot/tail")
def tail_bot(n: int = 200):
    p=pathlib.Path("logs/bot/bot.log")
    if not p.exists():
        return {"lines":[], "file": str(p)}
    with p.open("r", encoding="utf-8", errors="ignore") as fh:
        lines=fh.read().splitlines()[-n:]
    return {"lines": lines, "file": str(p)}

@router.get("/backend")
def backend_compat():
    return {"ok": True}

@router.get("/logs")
def logs_compat(n: int = 200):
    p=pathlib.Path("logs/bot/bot.log")
    if not p.exists():
        return {"lines":[], "file": str(p)}
    with p.open("r", encoding="utf-8", errors="ignore") as fh:
        lines=fh.read().splitlines()[-n:]
    return {"lines": lines, "file": str(p)}
