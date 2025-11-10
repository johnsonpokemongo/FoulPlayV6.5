"""
EPoké Client for FoulPlay
Communicates with EPoké ML service for fast move suggestions
"""
import os
import logging
import asyncio
from typing import Optional, Dict, Any
import concurrent.futures

try:
    import requests
except ImportError:
    requests = None

_LOG = logging.getLogger("epoke_client")

# Configuration from environment variables
EPOKE_URL = os.environ.get("EPOKE_URL", "http://127.0.0.1:8787/infer")
EPOKE_TIMEOUT_MS = int(os.environ.get("EPOKE_TIMEOUT_MS", "900"))

def epoke_enabled() -> bool:
    """
    Check if EPoké is enabled
    Returns: True if ENABLE_EPOKE env var is set to 1/true/yes
    """
    enabled_val = os.environ.get("ENABLE_EPOKE", "1")
    return enabled_val not in ("0", "false", "False", "no")

def _extract_move_and_confidence(resp_json: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Extract move and confidence from EPoké response
    Handles multiple response formats
    
    Returns: {"move": str, "confidence": float} or None
    """
    move = None
    conf = 0.5
    
    # Try common move field names
    for key in ("bestMoveName", "best_move_name", "bestMove", "moveName", "move", "action"):
        v = resp_json.get(key)
        if isinstance(v, str) and v.strip():
            move = v.strip()
            break
    
    # Try common confidence field names
    for key in ("confidence", "probability", "score", "certainty"):
        v = resp_json.get(key)
        if isinstance(v, (int, float)):
            conf = float(v)
            break
    
    # Check nested "data" object
    if move is None:
        data = resp_json.get("data")
        if isinstance(data, dict):
            result = _extract_move_and_confidence(data)
            if result:
                return result
    
    if move:
        # Clamp confidence to [0, 1]
        conf = max(0.0, min(1.0, conf))
        return {"move": move, "confidence": conf}
    
    return None

def battle_to_payload(battle_obj: Any) -> Dict[str, Any]:
    """
    Convert battle state to JSON payload for EPoké
    
    Args:
        battle_obj: Battle state object
        
    Returns: JSON payload
    """
    def safe_get(obj, attr, default=None):
        return getattr(obj, attr, default)
    
    # Extract basic battle info
    payload = {
        "format": safe_get(battle_obj, "format", None),
        "turn": safe_get(battle_obj, "turn", 0),
        "me": None,
        "opponent": None,
        "legal_moves": safe_get(battle_obj, "legal_moves", None),
        "room_id": safe_get(battle_obj, "battle_tag", None) or safe_get(battle_obj, "room_id", None)
    }
    
    # Try to get player names
    user = safe_get(battle_obj, "user", None) or safe_get(battle_obj, "you", None)
    if user:
        payload["me"] = safe_get(user, "name", "you")
    
    opponent = safe_get(battle_obj, "opponent", None)
    if opponent:
        payload["opponent"] = safe_get(opponent, "name", "opponent")
    
    return payload

def epoke_suggest_move(battle_obj: Any) -> Optional[Dict[str, Any]]:
    """
    Synchronous EPoké move suggestion
    
    Args:
        battle_obj: Battle state
        
    Returns: {"move": str, "confidence": float} or None on failure
    """
    if not epoke_enabled():
        _LOG.debug("EPoké disabled via ENABLE_EPOKE env var")
        return None
    
    if requests is None:
        _LOG.warning("EPoké enabled but 'requests' library not installed")
        return None
    
    try:
        payload = battle_to_payload(battle_obj)
        timeout_sec = EPOKE_TIMEOUT_MS / 1000.0
        
        _LOG.debug(f"Querying EPoké: {EPOKE_URL} (timeout: {timeout_sec}s)")
        
        r = requests.post(EPOKE_URL, json=payload, timeout=timeout_sec)
        r.raise_for_status()
        
        data = r.json()
        result = _extract_move_and_confidence(data)
        
        if result:
            _LOG.info(f"EPoké suggests: {result['move']} (confidence: {result['confidence']:.3f})")
        
        return result
        
    except requests.exceptions.Timeout:
        _LOG.debug(f"EPoké timeout after {EPOKE_TIMEOUT_MS}ms")
        return None
    except Exception as e:
        _LOG.debug(f"EPoké request failed: {e}")
        return None

async def epoke_suggest_move_async(battle_obj: Any) -> Optional[Dict[str, Any]]:
    """
    Async wrapper for EPoké move suggestion
    
    Args:
        battle_obj: Battle state
        
    Returns: {"move": str, "confidence": float} or None on failure
    """
    loop = asyncio.get_running_loop()
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return await loop.run_in_executor(pool, epoke_suggest_move, battle_obj)
