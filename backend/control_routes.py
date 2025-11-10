"""
Control routes for FoulPlay backend
Handles chat mute settings and other bot controls
"""
import json
from typing import Any, Dict
from fastapi import APIRouter, Request
from pathlib import Path

router = APIRouter(prefix="/control", tags=["control"])
STATE_FILE = Path("logs/chat_mute.json")

# Import chat guard functions (these will be available after patching)
try:
    from fp.chat_guard import set_mode, get_mode
except ImportError:
    # Fallback if not yet patched
    _mode = "hard"
    def get_mode() -> str:
        return _mode
    def set_mode(mode: str):
        global _mode
        _mode = mode

@router.get("/chat-mute")
def get_chat_mute() -> Dict[str, Any]:
    """Get current chat mute mode"""
    try:
        if STATE_FILE.exists():
            return json.loads(STATE_FILE.read_text())
    except Exception:
        pass
    return {"mode": get_mode()}

@router.post("/chat-mute")
async def set_chat_mute(req: Request) -> Dict[str, Any]:
    """Set chat mute mode (off, soft, hard)"""
    data = await req.json()
    mode = str(data.get("mode", "")).lower().strip()
    
    if mode not in ("off", "soft", "hard"):
        return {"error": "Invalid mode. Use: off, soft, or hard", "mode": get_mode()}
    
    set_mode(mode)
    
    # Persist to file
    try:
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        STATE_FILE.write_text(json.dumps({"mode": get_mode()}, ensure_ascii=False))
    except Exception as e:
        print(f"Warning: Could not save chat mute state: {e}")
    
    return {"mode": get_mode()}
