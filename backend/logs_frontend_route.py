from fastapi import APIRouter, Response
from pathlib import Path

router = APIRouter()

@router.get("/logs/frontend")
async def logs_frontend(n: int = 200):
    p1 = Path("logs/frontend/frontend.log")
    p2 = Path("logs/frontend/frontend.out")
    p = p1 if p1.exists() else p2
    if not p.exists():
        return Response("", media_type="text/plain")
    lines = p.read_text(encoding="utf-8", errors="ignore").splitlines()
    return Response("\n".join(lines[-n:]), media_type="text/plain")
