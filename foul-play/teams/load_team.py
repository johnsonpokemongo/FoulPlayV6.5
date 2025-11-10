from __future__ import annotations
import os, random
from pathlib import Path
from .team_converter import export_to_packed, export_to_dict

# Canonical team directory: repo_root/teams
def _repo_root_from_this_file() -> Path:
    # this file is foul-play/teams/load_team.py -> parents[2] is repo root
    return Path(__file__).resolve().parents[2]

def _canonical_teams_dir() -> Path:
    d = _repo_root_from_this_file() / "teams"
    try:
        d.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    return d

def _strip_known_prefixes(name: str) -> str:
    n = name.replace("\\", "/")
    for prefix in ("teams/", "foul-play/teams/", "/teams/"):
        if n.startswith(prefix):
            n = n[len(prefix):]
    return n

def _candidate_paths(name: str | Path) -> list[Path]:
    p = Path(str(name)).expanduser()
    if p.is_absolute():
        return [p]
    norm = _strip_known_prefixes(str(name))
    root = _repo_root_from_this_file()
    return [
        _canonical_teams_dir() / norm,                         # ~/FoulPlayV6.3/teams/<name>
        _canonical_teams_dir() / Path(norm).name,              # fallback by basename
        root / "foul-play" / "teams" / "teams" / norm,         # legacy: foul-play/teams/teams/<name>
        Path.cwd() / norm,                                     # current working dir
    ]

def _resolve_team_path(name: str | Path) -> Path:
    for c in _candidate_paths(name):
        if c.exists():
            return c
    # default to canonical dir with just the basename
    return _canonical_teams_dir() / Path(str(name)).name

def _pick_file(path: Path) -> Path:
    if path.is_file():
        return path
    if path.is_dir():
        files = [p for p in path.iterdir() if p.is_file() and not p.name.startswith(".")]
        if not files:
            raise ValueError(f"Directory has no team files: {path}")
        return random.choice(files)
    raise ValueError(f"Path must be file or dir: {path.name}")

def load_team(name):
    if name is None:
        return "null", "", ""
    target = _pick_file(_resolve_team_path(name))
    team_text = target.read_text(encoding="utf-8")
    return export_to_packed(team_text), export_to_dict(team_text), target.name
