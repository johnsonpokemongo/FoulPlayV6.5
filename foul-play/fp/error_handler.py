"""
FoulPlay Error Handling System
Inspired by Pokechamp's clear error messages
"""

import logging
import json
import traceback
from pathlib import Path
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """Error severity levels"""
    RECOVERABLE = "recoverable"  # Can continue battle
    BATTLE_FATAL = "battle_fatal"  # Must forfeit battle
    BOT_FATAL = "bot_fatal"  # Must restart bot


class FoulPlayError(Exception):
    """Base error class with context"""
    
    def __init__(self, message, severity=ErrorSeverity.RECOVERABLE, context=None):
        self.message = message
        self.severity = severity
        self.context = context or {}
        self.timestamp = datetime.now().isoformat()
        super().__init__(message)
    
    def to_dict(self):
        """Serialize for logging"""
        return {
            "error": self.__class__.__name__,
            "message": self.message,
            "severity": self.severity.value,
            "context": self.context,
            "timestamp": self.timestamp,
            "traceback": traceback.format_exc()
        }
    
    def log(self):
        """Log with full context"""
        logger.error(f"[{self.severity.value.upper()}] {self.message}")
        if self.context:
            logger.error(f"Context: {json.dumps(self.context, indent=2)}")


class InvalidMoveError(FoulPlayError):
    """Move is not legal in current state"""
    
    def __init__(self, move, available_moves, battle_state):
        context = {
            "attempted_move": move,
            "available_moves": available_moves,
            "active_pokemon": battle_state.user.active.name if battle_state.user.active else None,
            "opponent_active": battle_state.opponent.active.name if battle_state.opponent.active else None,
            "turn": battle_state.turn
        }
        super().__init__(
            f"Invalid move '{move}' - Available: {', '.join(available_moves)}",
            ErrorSeverity.RECOVERABLE,
            context
        )


class BattleStateError(FoulPlayError):
    """Battle state is inconsistent or corrupted"""
    
    def __init__(self, issue, battle_tag, last_message):
        context = {
            "battle_tag": battle_tag,
            "last_showdown_message": last_message,
            "issue": issue
        }
        super().__init__(
            f"Battle state error: {issue}",
            ErrorSeverity.BATTLE_FATAL,
            context
        )


class ShowdownProtocolError(FoulPlayError):
    """Unexpected message from Showdown server"""
    
    def __init__(self, message, expected):
        context = {
            "received": message,
            "expected": expected
        }
        super().__init__(
            f"Protocol error - Expected: {expected}, Got: {message[:100]}",
            ErrorSeverity.BATTLE_FATAL,
            context
        )


class SearchTimeoutError(FoulPlayError):
    """MCTS search took too long"""
    
    def __init__(self, elapsed_ms, limit_ms, battle_state):
        context = {
            "elapsed_ms": elapsed_ms,
            "limit_ms": limit_ms,
            "turn": battle_state.turn,
            "time_remaining": battle_state.time_remaining
        }
        super().__init__(
            f"Search timeout: {elapsed_ms}ms > {limit_ms}ms",
            ErrorSeverity.RECOVERABLE,
            context
        )


class ErrorHandler:
    """Central error handling system"""
    
    def __init__(self, log_dir="logs/errors"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.error_count = 0
    
    def handle(self, error: FoulPlayError, battle=None):
        """
        Handle error with appropriate response
        
        Returns:
            str or None: Fallback action if recoverable
        """
        self.error_count += 1
        error.log()
        
        # Save detailed error log
        error_file = self.log_dir / f"error_{self.error_count}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        error_file.write_text(json.dumps(error.to_dict(), indent=2))
        
        # Determine response
        if error.severity == ErrorSeverity.RECOVERABLE:
            return self._handle_recoverable(error, battle)
        elif error.severity == ErrorSeverity.BATTLE_FATAL:
            return self._handle_battle_fatal(error, battle)
        else:  # BOT_FATAL
            return self._handle_bot_fatal(error)
    
    def _handle_recoverable(self, error, battle):
        """Try to recover and continue"""
        if isinstance(error, InvalidMoveError):
            # Use first available move
            if error.context.get("available_moves"):
                fallback = error.context["available_moves"][0]
                logger.warning(f"Falling back to: {fallback}")
                return fallback
        
        elif isinstance(error, SearchTimeoutError):
            # Return random move
            if battle and battle.user.active:
                fallback = battle.user.active.moves[0].name
                logger.warning(f"Search timeout - using: {fallback}")
                return fallback
        
        return None
    
    def _handle_battle_fatal(self, error, battle):
        """Forfeit current battle"""
        logger.error("Battle cannot continue - forfeiting")
        if battle:
            battle.user.forfeited = True
        return "forfeit"
    
    def _handle_bot_fatal(self, error):
        """Shutdown bot gracefully"""
        logger.critical("Fatal error - bot must restart")
        logger.critical(f"Error details saved to: {self.log_dir}")
        raise SystemExit(1)


# Global handler instance
error_handler = ErrorHandler()


def safe_move_selection(func):
    """
    Decorator for move selection functions
    Catches errors and provides fallbacks
    """
    def wrapper(battle):
        try:
            return func(battle)
        except InvalidMoveError as e:
            return error_handler.handle(e, battle)
        except FoulPlayError as e:
            return error_handler.handle(e, battle)
        except Exception as e:
            # Wrap unexpected errors
            wrapped = FoulPlayError(
                f"Unexpected error in {func.__name__}: {str(e)}",
                ErrorSeverity.BATTLE_FATAL,
                {
                    "function": func.__name__,
                    "exception": e.__class__.__name__,
                    "battle_turn": battle.turn if battle else None
                }
            )
            return error_handler.handle(wrapped, battle)
    
    return wrapper


# Usage example:
"""
from fp.error_handler import safe_move_selection, InvalidMoveError

@safe_move_selection
def find_best_move(battle):
    if not battle.user.active:
        raise InvalidMoveError(
            "No active Pokemon",
            [],
            battle
        )
    
    # ... rest of MCTS logic
    return best_move
"""
