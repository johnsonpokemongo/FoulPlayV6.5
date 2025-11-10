#!/usr/bin/env python3
"""
Apply EPOké per-turn integration safely.

- Backs up files to ~/Desktop/FoulPlayV6.4/backups/
- Adds fp/epoke_client.py
- Injects an optional call to EPOké in fp/run_battle.py:async_pick_move
  (Falls back to existing MCTS if EPOké is disabled or errors)

Run:
    python3 tools/apply_epoke_integration.py /path/to/FoulPlayV6.4

If you omit the path, current working directory is used as project root.
"""
from __future__ import annotations
import sys, os, re, json, shutil, datetime
from pathlib import Path

PROJECT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
BACKUP_DIR = Path(os.path.expanduser("~/Desktop/FoulPlayV6.4/backups"))
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

def backup(p: Path):
    rel = p.relative_to(PROJECT)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    out = BACKUP_DIR / f"backup_{ts}" / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, out)
    print(f"BACKUP  -> {out}")

def find_file(name: str) -> Path | None:
    # Try common locations
    candidates = [
        PROJECT / "foul-play" / "fp" / name,
        PROJECT / "fp" / name,
        PROJECT / "foul-play" / name,
        PROJECT / name,
    ]
    for c in candidates:
        if c.exists():
            return c
    # Fallback: walk
    for p in PROJECT.rglob(name):
        return p
    return None

def ensure_epoke_client():
    # Place under the same package as run_battle.py (fp/)
    rb = find_file("run_battle.py")
    assert rb is not None, "Could not find run_battle.py under project."
    pkg_dir = rb.parent
    client = pkg_dir / "epoke_client.py"
    if client.exists():
        print(f"EXISTS  {client}")
        return client
    if (pkg_dir / "__init__.py").exists():
        backup(pkg_dir / "__init__.py")
    client.write_text('"""\nEPOké integration client for Foul Play.\n\nThis module is intentionally dependency-light and safe to import anywhere.\nIt uses environment variables for configuration so we don\'t need to touch\nyour existing config parsing.\n\nENV FLAGS\n---------\nFOULPLAY_USE_EPOKE / EPOKE_ENABLED  -> "1", "true", "yes", "on" to enable\nEPOKE_URL                             -> defaults to http://127.0.0.1:8000/epoke/infer\n\nUSAGE\n-----\nfrom fp.epoke_client import epoke_enabled, epoke_suggest_move_async\n\nif epoke_enabled():\n    move = await epoke_suggest_move_async(battle_copy)\n    if move:\n        # use it, else fall back to your normal search\n"""\nfrom __future__ import annotations\nimport os\nimport json\nimport logging\nimport asyncio\nimport concurrent.futures\nfrom typing import Optional\n\ntry:\n    import requests  # type: ignore\nexcept Exception:  # pragma: no cover\n    requests = None  # we will handle this gracefully\n\n_LOG = logging.getLogger(__name__)\n\ndef _truthy(v: str) -> bool:\n    return str(v or "").strip().lower() in ("1", "true", "yes", "on")\n\ndef epoke_enabled() -> bool:\n    v = (\n        os.getenv("FOULPLAY_USE_EPOKE")\n        or os.getenv("EPOKE_ENABLED")\n        or ""\n    )\n    if not _truthy(v):\n        return False\n    if requests is None:\n        _LOG.warning("EPOké enabled but \'requests\' package is missing.")\n        return False\n    return True\n\ndef epoke_url() -> str:\n    # Talk to the existing backend proxy by default\n    return os.getenv("EPOKE_URL") or "http://127.0.0.1:8000/epoke/infer"\n\ndef battle_to_payload(battle) -> dict:\n    # Keep this intentionally tiny to avoid depending on internal structures.\n    # You can expand this later.\n    try:\n        active_name = getattr(getattr(battle, "user", None), "active", None)\n        active_name = getattr(active_name, "name", None)\n    except Exception:\n        active_name = None\n    payload = {\n        "battleId": getattr(battle, "battle_tag", None) or getattr(battle, "rqid", None) or "local",\n        "turn": getattr(battle, "turn", None),\n        "format": getattr(battle, "format", None) or getattr(battle, "gen", None) or "gen9",\n        "state": {\n            "user_active": active_name,\n        },\n    }\n    return payload\n\ndef _extract_move_name(resp_json: dict) -> Optional[str]:\n    # Try a few common fields\n    for key in ("bestMoveName", "best_move_name", "bestMove", "moveName", "move"):\n        v = resp_json.get(key)\n        if isinstance(v, str) and v.strip():\n            return v.strip()\n    # Some wrappers return nested data\n    data = resp_json.get("data")\n    if isinstance(data, dict):\n        return _extract_move_name(data) or None\n    return None\n\ndef epoke_suggest_move(battle) -> Optional[str]:\n    if not epoke_enabled():\n        return None\n    url = epoke_url()\n    payload = battle_to_payload(battle)\n    try:\n        resp = requests.post(url, json=payload, timeout=0.9)\n        resp.raise_for_status()\n        data = resp.json()\n    except Exception as e:\n        _LOG.debug("EPOké request failed: %s", e)\n        return None\n    return _extract_move_name(data)\n\nasync def epoke_suggest_move_async(battle) -> Optional[str]:\n    loop = asyncio.get_event_loop()\n    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:\n        return await loop.run_in_executor(pool, epoke_suggest_move, battle)\n', encoding="utf-8")
    print(f"WROTE   {client}")
    return client

def patch_run_battle():
    rb = find_file("run_battle.py")
    assert rb is not None, "Could not find run_battle.py"
    src = rb.read_text(encoding="utf-8")
    if "epoke_suggest_move_async" in src:
        print("SKIP    run_battle.py already patched")
        return
    backup(rb)

    # 1) Ensure import
    # Insert after the first block of imports
    m = re.search(r"^((?:from\s+\S+\s+import\s+.*|import\s+.*)\n+)+", src, flags=re.M)
    insert_pos = m.end() if m else 0
    import_stmt = "\nfrom fp.epoke_client import epoke_enabled, epoke_suggest_move_async\n"
    if "epoke_client" not in src:
        src = src[:insert_pos] + import_stmt + src[insert_pos:]

    # 2) Inject call inside async_pick_move after update_from_request_json
    anchor = re.search(r"update_from_request_json\([^\)]*\)\s*\n", src)
    if not anchor:
        raise SystemExit("Could not locate 'update_from_request_json(...)' in async_pick_move")
    head = src[:anchor.end()]
    tail = src[anchor.end():]

    injected = """
    # --- EPOké advisory (optional) ---
    best_move = None
    try:
        if epoke_enabled():
            try:
                best_move = await epoke_suggest_move_async(battle_copy)
            except Exception as _e:
                logging.getLogger(__name__).warning("EPOké advisory failed: %s", _e)
                best_move = None
    except Exception:
        best_move = None
    # --- end EPOké advisory ---
    """
    src = head + injected + tail

    rb.write_text(src, encoding="utf-8")
    print("PATCHED", rb)


def main():
    print("Project:", PROJECT)
    ensure_epoke_client()
    patch_run_battle()
    print("Done. Set FOULPLAY_USE_EPOKE=1 to enable EPOké during battles.")

if __name__ == "__main__":
    main()
