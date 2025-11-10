"""
EPoké routes for FoulPlay backend
Provides health check and status for EPoké ML service
"""
import os
import time
from typing import Any, Dict
from fastapi import APIRouter
import requests

router = APIRouter(prefix="/epoke", tags=["epoke"])

def _get_epoke_url() -> str:
    """Get EPoké service URL from environment"""
    return os.environ.get("EPOKE_URL", "http://127.0.0.1:8788/infer")

def _get_health_url() -> str:
    """Get health check URL (remove /infer, add /health)"""
    base_url = _get_epoke_url().rsplit("/", 1)[0]
    return f"{base_url}/health"

@router.get("/health")
def health() -> Dict[str, Any]:
    """
    Check if EPoké service is reachable and responding
    Returns: {"ok": bool, "latency_ms": int, "url": str}
    """
    url = _get_health_url()
    t0 = time.time()
    
    try:
        r = requests.get(url, timeout=1.0)
        elapsed_ms = int((time.time() - t0) * 1000)
        
        ok = r.status_code == 200
        if ok:
            try:
                data = r.json()
                ok = data.get("ok", False)
            except:
                pass
        
        return {
            "ok": ok,
            "latency_ms": elapsed_ms,
            "url": url,
            "status_code": r.status_code
        }
    except requests.exceptions.Timeout:
        return {
            "ok": False,
            "error": "Timeout after 1s",
            "url": url,
            "latency_ms": 1000
        }
    except Exception as e:
        return {
            "ok": False,
            "error": str(e),
            "url": url,
            "latency_ms": 0
        }

@router.get("/status")
def status() -> Dict[str, Any]:
    """
    Get EPoké configuration and status
    """
    enabled = os.environ.get("ENABLE_EPOKE", "1") not in ("0", "false", "False")
    url = _get_epoke_url()
    
    health_result = health()
    
    return {
        "enabled": enabled,
        "url": url,
        "reachable": health_result.get("ok", False),
        "latency_ms": health_result.get("latency_ms", 0)
    }
