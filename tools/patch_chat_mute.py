"""
Websocket Client Patcher
Injects chat_guard sanitization into send_message() method

Usage:
    python3 patch_chat_mute.py /path/to/websocket_client.py
"""
import re
import sys
import pathlib

def patch_websocket_client(filepath: str) -> bool:
    """
    Patch websocket_client.py to use chat_guard
    
    Args:
        filepath: Path to websocket_client.py
        
    Returns: True if patched successfully
    """
    p = pathlib.Path(filepath)
    
    if not p.exists():
        print(f"ERROR: File not found: {filepath}")
        return False
    
    print(f"Reading {filepath}...")
    s = p.read_text(encoding="utf-8")
    
    # Check if already patched
    if "from fp.chat_guard import" in s or "from .chat_guard import" in s:
        print("✓ File already patched (chat_guard import found)")
        return True
    
    # Add import statement
    if "import logging" in s:
        s = s.replace(
            "import logging",
            "import logging\nfrom fp.chat_guard import sanitize_message_list, set_mode, get_mode"
        )
        print("✓ Added chat_guard import")
    else:
        print("ERROR: Could not find 'import logging' line")
        return False
    
    # Find send_message method
    pat = r"async def send_message\(\s*self\s*,\s*room\s*,\s*message_list\s*\):"
    m = re.search(pat, s)
    
    if not m:
        print("ERROR: Could not find send_message() method")
        return False
    
    print("✓ Found send_message() method")
    
    start = m.end()
    
    # Find end of function (next async def or end of file)
    m2 = re.search(r"\n\s*async def\s+", s[start:])
    end = start + (m2.start() if m2 else len(s))
    
    # Create new function body with chat guard
    new_body = '''
        # Convert message_list to list if needed
        if isinstance(message_list, str):
            message_list = [message_list]
        elif not isinstance(message_list, (list, tuple)):
            message_list = [str(message_list)]
        
        # Apply chat guard filter
        safe_list = sanitize_message_list(message_list)
        
        # Send only whitelisted messages
        message = room + "|" + "|".join(safe_list)
        logger.debug("Sending message to websocket: {}".format(message))
        await self.websocket.send(message)
        self.last_message = message
'''
    
    # Add proper indentation
    new_body = "\n".join(
        ("        " + line) if line.strip() else line
        for line in new_body.splitlines()
    )
    
    # Reconstruct file
    s2 = s[:start] + new_body + "\n" + s[end:]
    
    # Write back
    print(f"Writing patched file...")
    p.write_text(s2, encoding="utf-8")
    
    print("✓ Successfully patched websocket_client.py")
    print("\n" + "="*60)
    print("IMPORTANT: The chat guard is now active!")
    print("Mode: HARD (only game commands allowed)")
    print("Change via: POST /control/chat-mute {\"mode\": \"off|soft|hard\"}")
    print("="*60)
    
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 patch_chat_mute.py /path/to/websocket_client.py")
        sys.exit(1)
    
    filepath = sys.argv[1]
    success = patch_websocket_client(filepath)
    sys.exit(0 if success else 2)
