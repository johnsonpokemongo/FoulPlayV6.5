"""
EPoké Client for Backend
Simple wrapper for backend to query EPoké service
"""
import os
import requests

EPOKE_URL = os.environ.get("EPOKE_URL", "http://127.0.0.1:8787")

def health(timeout: float = 0.5):
    """
    Check EPoké service health
    Returns: (success: bool, response: dict)
    """
    try:
        r = requests.get(EPOKE_URL.rstrip("/") + "/health", timeout=timeout)
        r.raise_for_status()
        return True, r.json()
    except Exception as e:
        return False, {"error": str(e)}

def infer(payload: dict, timeout: float = 1.0):
    """
    Query EPoké for move inference
    Returns: (success: bool, response: dict)
    """
    try:
        r = requests.post(EPOKE_URL.rstrip("/") + "/infer", json=payload, timeout=timeout)
        r.raise_for_status()
        return True, r.json()
    except Exception as e:
        return False, {"error": str(e)}
