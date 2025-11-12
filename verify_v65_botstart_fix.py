#!/usr/bin/env python3
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent

def grep(path, pat):
    s = path.read_text(encoding="utf-8")
    return bool(re.search(pat, s, re.S|re.M))

def check_backend():
    p = ROOT / "backend" / "main.py"
    if not p.exists():
        return "[MISS] backend/main.py is missing"
    ok_build = grep(p, r'if key in \("ps_username", "ps_password"\):[\s\S]*str\(val\)\)')
    return "[OK] backend/main.py" if ok_build else "[WARN] backend/main.py may be missing build_cmd empty-flag fix"

def check_config():
    p = ROOT / "foul-play" / "config.py"
    if not p.exists():
        return "[MISS] foul-play/config.py is missing"
    ok_env = grep(p, r'os\.environ\.get\("FP_LOG_DIR"')
    return "[OK] foul-play/config.py" if ok_env else "[WARN] foul-play/config.py did not adopt FP_LOG_DIR"

def check_gui():
    p = ROOT / "frontend" / "src" / "tabs" / "FoulPlayGUI.jsx"
    if not p.exists():
        return "[MISS] frontend/src/tabs/FoulPlayGUI.jsx is missing"
    no_control = not grep(p, r'/control/start')
    has_guard = grep(p, r'const canStart')
    return "[OK] FoulPlayGUI.jsx" if (no_control and has_guard) else "[WARN] FoulPlayGUI.jsx still allows blank creds or calls /control/start"

def main():
    print(check_backend())
    print(check_config())
    print(check_gui())

if __name__ == "__main__":
    main()
