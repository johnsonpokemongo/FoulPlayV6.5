#!/usr/bin/env python3
import os, re, sys, time, json, textwrap, pathlib, shutil

ROOT = pathlib.Path(__file__).resolve().parent
PROJECT = ROOT  # assume we run from repo root after unzipping

CHANGES = []

def backup(path: pathlib.Path):
    ts = time.strftime("%Y%m%d_%H%M%S")
    bak = path.with_name(path.name + f".bak_{ts}")
    shutil.copy2(path, bak)
    return bak

def load_text(path: pathlib.Path):
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return None

def save_text(path: pathlib.Path, text: str):
    path.write_text(text, encoding="utf-8")

def patch_backend_main(main_path: pathlib.Path):
    src = load_text(main_path)
    if src is None:
        print(f"[SKIP] backend/main.py not found")
        return False

    original = src
    did_change = False

    # 1) Ensure /start merges DEFAULTS + saved_config + request_json and validates required fields
    start_pat = re.compile(r'@app\.post\(["\']/start["\']\)\s*async def\s+\w+\(.*?\):(.+?)(?=^@app\.|^#|^\Z)', re.S | re.M)
    m = start_pat.search(src)
    if m:
        body = m.group(1)
        need_merge = not re.search(r'\bcfg\s*=\s*{', body) or not re.search(r'defaults', body, re.I)
        needs_validation = not re.search(r'ps_username', body) or (not re.search(r'HTTPException', body) and not re.search(r'status_code\s*=\s*400', body))

        new_body = body
        if need_merge or needs_validation:
            merge_block = r'''
    data = await req.json() if "req" in locals() or "req" in globals() else {}
    try:
        saved = load_saved_config() if "load_saved_config" in globals() else {}
    except Exception:
        saved = {}
    try:
        defaults = DEFAULTS
    except Exception:
        defaults = {}
    cfg = {}
    cfg.update(defaults or {})
    cfg.update(saved or {})
    cfg.update(data or {})

    required = ["ps_username","ps_password","websocket_uri","bot_mode","pokemon_format"]
    missing = [k for k in required if not str(cfg.get(k,"")).strip()]
    if missing:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing)}")
'''
            if re.search(r'^\s*pass\s*$', new_body, re.M):
                new_body = re.sub(r'^\s*pass\s*$', merge_block, new_body, count=1, flags=re.M)
            else:
                new_body = merge_block + new_body
            did_change = True

        if 'start_proc' in body and 'STATE' in src and 'running' in src:
            if 'STATE["running"] = True' not in body:
                new_body = re.sub(r'(pid\s*=\s*start_proc\(cfg\)\s*)', r'\1\n    STATE["running"] = True\n', new_body, count=1)
                did_change = True

        src = src[:m.start(1)] + new_body + src[m.end(1):]

    else:
        print("[WARN] Could not locate @app.post('/start') handler; skipping that patch.")

    # 2) In build_cmd, stop forcing empty --ps-username/--ps-password
    bc_pat = re.compile(r'def\s+build_cmd\(\s*cfg\s*\)\s*:(.+?)(?=^def\s|\Z)', re.S | re.M)
    m2 = bc_pat.search(src)
    if m2:
        body = m2.group(1)
        body2 = re.sub(
            r'if\s+key\s+in\s*\(\s*[\'"]ps_username[\'"]\s*,\s*[\'"]ps_password[\'"]\s*\)\s*:\s*[\r\n]+\s*cmd\.extend\(\[\s*flag\s*,\s*""\s*if\s*val\s+is\s+None\s*else\s*str\(val\)\s*\]\)',
            'if key in ("ps_username", "ps_password"):\n            if str(val).strip():\n                cmd.extend([flag, str(val)])',
            body
        )
        if body2 != body:
            src = src[:m2.start(1)] + body2 + src[m2.end(1):]
            did_change = True
    else:
        print("[WARN] build_cmd(cfg) not found; skipping empty-cred flag fix.")

    # 3) Add last_exit_code/last_stderr_tail fields to STATE init if present
    if 'STATE = ' in src and 'last_exit_code' not in src:
        src = re.sub(r'STATE\s*=\s*{', 'STATE = { "last_exit_code": None, "last_stderr_tail": None, ', src, count=1)
        did_change = True

    if did_change:
        bak = backup(main_path)
        save_text(main_path, src)
        print(f"[OK] Patched backend/main.py (backup: {bak.name})")
        CHANGES.append(str(main_path))
        return True
    else:
        print("[SKIP] backend/main.py already looks patched")
        return False

def patch_foulplay_config(cfg_path: pathlib.Path):
    src = load_text(cfg_path)
    if src is None:
        print(f"[SKIP] foul-play/config.py not found")
        return False

    did_change = False
    if re.search(r'CustomRotatingFileHandler\(\s*[\'"]bot\.log[\'"]\s*\)', src):
        src = re.sub(r'CustomRotatingFileHandler\(\s*[\'"]bot\.log[\'"]\s*\)',
                     'CustomRotatingFileHandler(os.path.join(os.environ.get("FP_LOG_DIR", "."), "bot.log"))',
                     src)
        if not re.search(r'^\s*import\s+os\s*$', src, re.M):
            src = 'import os\n' + src
        did_change = True

    if did_change:
        bak = backup(cfg_path)
        save_text(cfg_path, src)
        print(f"[OK] Patched foul-play/config.py (backup: {bak.name})")
        CHANGES.append(str(cfg_path))
        return True
    else:
        print("[SKIP] foul-play/config.py already looks patched")
        return False

def patch_frontend_gui(gui_path: pathlib.Path):
    src = load_text(gui_path)
    if src is None:
        print(f"[SKIP] frontend/src/tabs/FoulPlayGUI.jsx not found")
        return False

    did_change = False
    src2 = re.sub(r'fetch\([^)]*/control/start[^)]*\)[^\n;]*[;\n]', '', src)
    if src2 != src:
        src = src2
        did_change = True

    if 'function startBot' in src and 'ps_username' in src:
        if 'const canStart' not in src:
            src = src.replace('function startBot()', 'const canStart = (username && password);\nfunction startBot()')
            did_change = True
        src = re.sub(r'<button([^>]+)onClick=\{startBot\}', r'<button\1disabled={!canStart} onClick={startBot}', src)

    if did_change:
        bak = backup(gui_path)
        save_text(gui_path, src)
        print(f"[OK] Patched frontend/src/tabs/FoulPlayGUI.jsx (backup: {bak.name})")
        CHANGES.append(str(gui_path))
        return True
    else:
        print("[SKIP] FoulPlayGUI.jsx already looks patched")
        return False

def main():
    print("== FoulPlay V6.5 Start Button Patch (apply) ==")
    touched = 0
    touched += bool(patch_backend_main(PROJECT / "backend" / "main.py"))
    touched += bool(patch_foulplay_config(PROJECT / "foul-play" / "config.py"))
    touched += bool(patch_frontend_gui(PROJECT / "frontend" / "src" / "tabs" / "FoulPlayGUI.jsx"))
    if not touched:
        print("No changes applied.")
    else:
        print("Changed files:")
        for f in CHANGES:
            print(" -", f)
        print("Done.")

if __name__ == "__main__":
    main()
