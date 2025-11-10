"""
Smogon Data Client for FoulPlay V6.6
Fetches common movesets, items, and spreads from Smogon API
"""

import logging
import requests
from typing import Dict, List, Optional
from pathlib import Path
import json

logger = logging.getLogger(__name__)


class SmogonClient:
    """
    Client for fetching Smogon usage data and analyses
    Used by MCTS to predict opponent moves
    """
    
    def __init__(self, cache_dir="logs/smogon_cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache = {}
        self.base_url = "https://pkmn.cc/smogon"
    
    def _get_cache_key(self, pokemon: str, format: str) -> str:
        """Generate cache key"""
        return f"{format}:{pokemon.lower()}"
    
    def _load_from_cache(self, key: str) -> Optional[Dict]:
        """Load from disk cache"""
        cache_file = self.cache_dir / f"{key.replace(':', '_')}.json"
        if cache_file.exists():
            try:
                return json.loads(cache_file.read_text())
            except:
                pass
        return None
    
    def _save_to_cache(self, key: str, data: Dict):
        """Save to disk cache"""
        cache_file = self.cache_dir / f"{key.replace(':', '_')}.json"
        try:
            cache_file.write_text(json.dumps(data, indent=2))
        except Exception as e:
            logger.warning(f"Failed to cache {key}: {e}")
    
    def get_common_moves(self, pokemon: str, format: str = "gen9ou", top_n: int = 4) -> List[str]:
        """
        Get most common moves for a Pokemon
        
        Args:
            pokemon: Pokemon name (e.g., "Landorus-Therian")
            format: Battle format (default: gen9ou)
            top_n: Number of moves to return (default: 4)
        
        Returns:
            List of move names, e.g., ["earthquake", "uturn", "stealthrock", "knockoff"]
        """
        key = self._get_cache_key(pokemon, format)
        
        # Check memory cache
        if key in self.cache:
            return self.cache[key].get("moves", [])[:top_n]
        
        # Check disk cache
        cached = self._load_from_cache(key)
        if cached:
            self.cache[key] = cached
            return cached.get("moves", [])[:top_n]
        
        # Fetch from API
        try:
            url = f"{self.base_url}/analyses/{format}/{pokemon.lower()}"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                moves = self._parse_moves(data)
                
                # Cache result
                cache_data = {"moves": moves, "raw": data}
                self.cache[key] = cache_data
                self._save_to_cache(key, cache_data)
                
                return moves[:top_n]
            else:
                logger.warning(f"Smogon API returned {response.status_code} for {pokemon}")
        except Exception as e:
            logger.error(f"Failed to fetch Smogon data for {pokemon}: {e}")
        
        # Fallback: empty list
        return []
    
    def _parse_moves(self, data: Dict) -> List[str]:
        """Parse moves from Smogon API response"""
        moves = []
        
        try:
            # Smogon format: look for most common moveset
            if "strategies" in data:
                for strategy in data["strategies"]:
                    if "movesets" in strategy:
                        for moveset in strategy["movesets"]:
                            if "moves" in moveset:
                                moves.extend(moveset["moves"])
            
            # Deduplicate and normalize
            seen = set()
            result = []
            for move in moves:
                normalized = move.lower().replace(" ", "")
                if normalized not in seen:
                    seen.add(normalized)
                    result.append(normalized)
            
            return result
        except Exception as e:
            logger.error(f"Failed to parse Smogon moves: {e}")
            return []
    
    def get_common_item(self, pokemon: str, format: str = "gen9ou") -> Optional[str]:
        """
        Get most common item for a Pokemon
        
        Returns:
            Item name, e.g., "choicescarf"
        """
        key = self._get_cache_key(pokemon, format)
        
        if key in self.cache and "item" in self.cache[key]:
            return self.cache[key]["item"]
        
        # For now, return None (can be enhanced later)
        return None
    
    def predict_opponent_moves(self, pokemon_name: str, format: str = "gen9ou") -> List[str]:
        """
        Predict likely moves for an opponent's Pokemon
        This is used by MCTS when opponent moves are unknown
        
        Args:
            pokemon_name: Name of opponent's Pokemon
            format: Battle format
        
        Returns:
            List of 4 most likely moves
        """
        moves = self.get_common_moves(pokemon_name, format, top_n=4)
        
        if moves:
            logger.debug(f"Predicted moves for {pokemon_name}: {moves}")
            return moves
        else:
            logger.warning(f"No Smogon data for {pokemon_name}, using defaults")
            return ["tackle", "return", "protect", "rest"]  # Safe defaults


# Global instance
smogon_client = SmogonClient()


# Convenience functions for easy import
def get_likely_moves(pokemon: str, format: str = "gen9ou") -> List[str]:
    """Get likely moves for a Pokemon"""
    return smogon_client.get_common_moves(pokemon, format)


def predict_opponent_moveset(pokemon: str, format: str = "gen9ou") -> List[str]:
    """Predict opponent's likely moveset"""
    return smogon_client.predict_opponent_moves(pokemon, format)
