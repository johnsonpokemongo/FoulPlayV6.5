"""
FoulPlay Agent System - Multiple decision strategies
Inspired by Pokechamp's agent architecture
"""

from abc import ABC, abstractmethod
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class AgentType(Enum):
    """Available decision agents"""
    MCTS = "mcts"                    # Monte Carlo Tree Search (default)
    MCTS_FAST = "mcts_fast"          # Shallow MCTS (100ms)
    MCTS_DEEP = "mcts_deep"          # Deep MCTS (5000ms)
    HYBRID = "hybrid"                # MCTS + EPoké
    MAX_DAMAGE = "max_damage"        # Greedy damage maximizer
    RANDOM = "random"                # Random legal moves (testing)
    SAFE = "safe"                    # Defensive play (minimize damage taken)


class Agent(ABC):
    """Base agent interface"""
    
    def __init__(self, config):
        self.config = config
        self.name = self.__class__.__name__
    
    @abstractmethod
    def select_move(self, battle):
        """
        Choose a move for the current battle state
        
        Args:
            battle: Battle object with current state
            
        Returns:
            str: Move choice (e.g., "move tackle", "switch 2")
        """
        pass
    
    def on_battle_start(self, battle):
        """Called when battle starts"""
        pass
    
    def on_battle_end(self, battle, result):
        """Called when battle ends"""
        pass


class MCTSAgent(Agent):
    """Standard MCTS search agent"""
    
    def select_move(self, battle):
        from fp.search.main import find_best_move
        return find_best_move(battle)


class MCTSFastAgent(Agent):
    """Fast MCTS for quick games"""
    
    def select_move(self, battle):
        from fp.search.main import find_best_move
        original_time = self.config.search_time_ms
        self.config.search_time_ms = 100
        move = find_best_move(battle)
        self.config.search_time_ms = original_time
        return move


class MCTSDeepAgent(Agent):
    """Deep MCTS for maximum strength"""
    
    def select_move(self, battle):
        from fp.search.main import find_best_move
        original_time = self.config.search_time_ms
        self.config.search_time_ms = 5000
        move = find_best_move(battle)
        self.config.search_time_ms = original_time
        return move


class HybridAgent(Agent):
    """MCTS + EPoké hybrid (current V6.5 default)"""
    
    def select_move(self, battle):
        from fp.run_battle import async_pick_move
        import asyncio
        return asyncio.run(async_pick_move(battle))


class MaxDamageAgent(Agent):
    """
    Greedy agent that always picks highest damage move
    Fast but predictable - good for testing
    """
    
    def select_move(self, battle):
        from fp.helpers import calculate_damage
        
        best_move = None
        best_damage = -1
        
        # Check all available moves
        for move in battle.user.active.moves:
            if move.disabled:
                continue
            
            # Calculate expected damage
            damage = calculate_damage(
                move,
                battle.user.active,
                battle.opponent.active
            )
            
            if damage > best_damage:
                best_damage = damage
                best_move = move.name
        
        # Fallback to first move if calculation fails
        if best_move is None:
            best_move = battle.user.active.moves[0].name
        
        logger.info(f"[MAX_DAMAGE] Chose {best_move} (est. damage: {best_damage})")
        return best_move


class RandomAgent(Agent):
    """
    Picks random legal moves
    Used for testing opponent modeling
    """
    
    def select_move(self, battle):
        import random
        
        available_moves = [
            m.name for m in battle.user.active.moves
            if not m.disabled
        ]
        
        if not available_moves:
            # Try to switch
            if battle.user.reserve:
                return f"switch {battle.user.reserve[0].name}"
            # Forced to use disabled move (struggle)
            available_moves = [battle.user.active.moves[0].name]
        
        choice = random.choice(available_moves)
        logger.info(f"[RANDOM] Chose {choice}")
        return choice


class SafeAgent(Agent):
    """
    Defensive agent that minimizes damage taken
    Good for stall teams
    """
    
    def select_move(self, battle):
        from fp.helpers import calculate_damage
        
        best_move = None
        min_damage_taken = float('inf')
        
        # Evaluate each move based on expected counterplay
        for move in battle.user.active.moves:
            if move.disabled:
                continue
            
            # Simulate opponent's best response
            max_counter_damage = 0
            for opp_move in battle.opponent.active.moves:
                counter_damage = calculate_damage(
                    opp_move,
                    battle.opponent.active,
                    battle.user.active
                )
                max_counter_damage = max(max_counter_damage, counter_damage)
            
            # Pick move that minimizes opponent's counter
            if max_counter_damage < min_damage_taken:
                min_damage_taken = max_counter_damage
                best_move = move.name
        
        if best_move is None:
            best_move = battle.user.active.moves[0].name
        
        logger.info(f"[SAFE] Chose {best_move} (min counter: {min_damage_taken})")
        return best_move


# Agent registry
AGENTS = {
    AgentType.MCTS: MCTSAgent,
    AgentType.MCTS_FAST: MCTSFastAgent,
    AgentType.MCTS_DEEP: MCTSDeepAgent,
    AgentType.HYBRID: HybridAgent,
    AgentType.MAX_DAMAGE: MaxDamageAgent,
    AgentType.RANDOM: RandomAgent,
    AgentType.SAFE: SafeAgent,
}


def create_agent(agent_type: AgentType, config):
    """Factory function to create agents"""
    if agent_type not in AGENTS:
        raise ValueError(f"Unknown agent: {agent_type}")
    
    agent_class = AGENTS[agent_type]
    return agent_class(config)


def list_agents():
    """Get all available agents"""
    return [
        {
            "name": agent_type.value,
            "class": agent_class.__name__,
            "description": agent_class.__doc__.strip() if agent_class.__doc__ else ""
        }
        for agent_type, agent_class in AGENTS.items()
    ]
