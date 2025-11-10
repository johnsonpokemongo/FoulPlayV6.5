"""
Decision Logger for FoulPlay
Logs AI decisions (MCTS, EPoké, Hybrid) to JSONL format
"""
import os
import json
import time
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

_LOG_DIR = Path(os.environ.get("FP_LOG_DIR", "logs"))
_LOG_DIR.mkdir(parents=True, exist_ok=True)
_DECISION_LOG = _LOG_DIR / "decisions" / "decisions.jsonl"
_DECISION_LOG.parent.mkdir(parents=True, exist_ok=True)
_LOCK = threading.Lock()

def _now_ms() -> int:
    return int(time.time() * 1000)

def _append_jsonl(path: Path, obj: Dict[str, Any]) -> None:
    with _LOCK:
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")

def log_mcts_decision(
    battle_id: str,
    turn: int,
    chosen_move: str,
    policies: Optional[List[Dict[str, Any]]] = None,
    search_time_ms: Optional[float] = None,
    extra: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    row = {
        "ts": _now_ms(),
        "battle_id": battle_id,
        "turn": turn,
        "selected_move": chosen_move,
        "mode": "MCTS",
        "mcts_choices": policies or [],
        "mcts_search_time_ms": search_time_ms,
        "epoke_choice": None,
    }
    if extra:
        row.update(extra)
    _append_jsonl(_DECISION_LOG, row)
    return row

def log_hybrid_decision(
    battle_id: str,
    turn: int,
    mcts_move: str,
    mcts_confidence: float,
    epoke_move: Optional[str],
    epoke_confidence: Optional[float],
    chosen_move: str,
    chosen_source: str,
    mcts_choices: Optional[List[Dict[str, Any]]] = None,
    timings_ms: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    row = {
        "ts": _now_ms(),
        "battle_id": battle_id,
        "turn": turn,
        "mode": "HYBRID",
        "mcts_move": mcts_move,
        "mcts_confidence": mcts_confidence,
        "epoke_move": epoke_move,
        "epoke_confidence": epoke_confidence,
        "selected_move": chosen_move,
        "chosen_source": chosen_source,
        "mcts_choices": mcts_choices or [],
        "epoke_choice": {"move": epoke_move, "confidence": epoke_confidence} if epoke_move else None,
        "timings_ms": timings_ms or {},
    }
    _append_jsonl(_DECISION_LOG, row)
    return row

def latest_decision() -> Optional[Dict[str, Any]]:
    if not _DECISION_LOG.exists():
        return None
    last = None
    try:
        with _DECISION_LOG.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    last = json.loads(line)
                except Exception:
                    continue
    except Exception:
        return None
    return last

def get_recent_decisions(n: int = 50) -> List[Dict[str, Any]]:
    if not _DECISION_LOG.exists():
        return []
    decisions = []
    try:
        with _DECISION_LOG.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    decisions.append(json.loads(line))
                except Exception:
                    continue
    except Exception:
        return []
    return decisions[-n:]

def get_battle_decisions(battle_id: str) -> List[Dict[str, Any]]:
    if not _DECISION_LOG.exists():
        return []
    decisions = []
    try:
        with _DECISION_LOG.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    data = json.loads(line)
                    if data.get("battle_id") == battle_id:
                        decisions.append(data)
                except Exception:
                    continue
    except Exception:
        return []
    return decisions
