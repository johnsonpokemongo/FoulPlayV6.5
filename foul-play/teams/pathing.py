from __future__ import annotations
from pathlib import Path

def project_root_from_foul_play() -> Path:
    return Path(__file__).resolve().parents[2]

def canonical_teams_dir() -> Path:
    d = project_root_from_foul_play() / "teams"
    d.mkdir(parents=True, exist_ok=True)
    return d

def _strip_known_prefixes(name: str) -> str:
    n = name.replace("\\", "/")
    for prefix in ("teams/", "foul-play/teams/", "/teams/"):
        if n.startswith(prefix):
            n = n[len(prefix):]
    return n

def resolve_team_path(name: str | Path) -> Path:
    p = Path(str(name)).expanduser()
    if p.is_absolute():
        return p
    norm = _strip_known_prefixes(str(name))
    root = project_root_from_foul_play()
    candidates = [
        canonical_teams_dir() / norm,
        canonical_teams_dir() / Path(norm).name,
        root / "foul-play" / "teams" / norm,
        Path.cwd() / norm,
    ]
    for c in candidates:
        if c.exists():
            return c
    return canonical_teams_dir() / Path(norm).name
