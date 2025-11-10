from fastapi import APIRouter
import httpx
import os

router = APIRouter(prefix="/pkmn", tags=["pkmn"])

PKMN_URL = os.getenv("PKMN_SVC_URL", "http://127.0.0.1:8787")

@router.get("/health")
async def pkmn_health():
    """Check if PKMN service is reachable"""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{PKMN_URL}/health")
            return {"ok": response.status_code == 200, "url": PKMN_URL}
    except Exception as e:
        return {"ok": False, "url": PKMN_URL, "error": str(e)}
