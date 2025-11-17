from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, Optional

_DATA_ROOT = Path(__file__).resolve().parent

class RandomBattleTeamDatasets:
    _cache: Dict[str, Any] = {}

    @classmethod
    def load(cls, fmt: str) -> Optional[Any]:
        key = (fmt or "").strip().lower()
        if not key:
            return None
        if key in cls._cache:
            return cls._cache[key]
        name_map = {
            "gen9randombattle": "gen9randombattle.json",
            "gen8randombattle": "gen8randombattle.json",
            "gen7randombattle": "gen7randombattle.json",
        }
        fname = name_map.get(key)
        if not fname:
            return None
        fpath = _DATA_ROOT / fname
        if not fpath.exists():
            return None
        try:
            data = json.loads(fpath.read_text(encoding="utf-8"))
        except Exception:
            return None
        cls._cache[key] = data
        return data
