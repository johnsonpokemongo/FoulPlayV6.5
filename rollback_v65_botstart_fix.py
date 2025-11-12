#!/usr/bin/env python3
import pathlib, os, shutil

ROOT = pathlib.Path(__file__).resolve().parent

def restore_latest_backup(path: pathlib.Path):
    backups = sorted(path.parent.glob(path.name + ".bak_*"))
    if not backups:
        print(f"[NONE] No backups for {path}")
        return False
    bak = backups[-1]
    shutil.copy2(bak, path)
    print(f"[OK] Restored {path} from {bak.name}")
    return True

def main():
    restore_latest_backup(ROOT / "backend" / "main.py")
    restore_latest_backup(ROOT / "foul-play" / "config.py")
    restore_latest_backup(ROOT / "frontend" / "src" / "tabs" / "FoulPlayGUI.jsx")

if __name__ == "__main__":
    main()
