"""
Chat Guard System for FoulPlay
Prevents accidental chat messages from being sent to Pokemon Showdown
"""
import re
import logging

_LOG = logging.getLogger("chat_guard")
_MODE = "lax"

def set_mode(mode: str):
    """Set chat guard mode"""
    global _MODE
    valid_modes = ("off", "lax", "soft", "hard")
    _MODE = mode.lower() if mode and mode.lower() in valid_modes else "lax"
    _LOG.info(f"Chat guard mode: {_MODE}")

def get_mode() -> str:
    """Get current chat guard mode"""
    return _MODE

# Complete whitelist of allowed commands
_ALLOWED_PREFIXES = (
    "/choose", "/move", "/switch", "/team", "/undo",
    "/search", "/cancelsearch", "/stopsearch", "/accept", "/reject", "/challenge",
    "/forfeit", "/timer", "/savereplay", "/savelog", "/leave",
    "/trn", "/login", "/logout",
    "/join", "/part", "/roomvoice",
    "/avatar", "/status", "/cmd",
    "/utm", "/useteam",
    "/ping", "/data", "/msg",
)

def sanitize_message_list(messages):
    """Filter messages to only allow game commands"""
    if _MODE == "off":
        return list(messages) if isinstance(messages, (list, tuple)) else [str(messages)]
    
    out = []
    msg_list = messages if isinstance(messages, (list, tuple)) else [messages]
    
    for msg in msg_list:
        if not isinstance(msg, str):
            msg = str(msg)
        
        s = msg.strip()
        
        if not s.startswith("/"):
            _LOG.debug(f"[CHAT_GUARD] Blocked non-command: {s[:50]}")
            continue
        
        allowed = any(s.startswith(prefix) for prefix in _ALLOWED_PREFIXES)
        
        if allowed:
            out.append(s)
        else:
            _LOG.warning(f"[CHAT_GUARD] Blocked: {s[:50]}")
    
    return out

def should_send(msg):
    """Check if a message should be sent"""
    try:
        lst = msg if isinstance(msg, (list, tuple)) else [msg]
        return len(sanitize_message_list(lst)) > 0
    except Exception:
        return True
