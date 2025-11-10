import re
import json
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

class BattleStateParser:
    """Parses bot logs to extract live battle state"""
    
    def __init__(self, log_file: Path):
        self.log_file = log_file
        self.current_battle = None
        
    def parse_latest_battle_state(self) -> Optional[Dict]:
        """Parse the most recent battle state from logs"""
        if not self.log_file.exists():
            return None
            
        try:
            with open(self.log_file, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                
            # Find the most recent battle initialization
            battle_id = None
            for line in reversed(lines):
                if 'Initialized battle-' in line:
                    match = re.search(r'battle-([^-]+)-\d+', line)
                    if match:
                        battle_id = match.group(0)
                        break
            
            if not battle_id:
                return None
                
            # Parse battle events for this battle
            state = {
                "battle_id": battle_id,
                "format": self._extract_format(battle_id),
                "turn": 0,
                "your_team": [],
                "opponent_team": [],
                "your_active": None,
                "opponent_active": None,
                "field": {
                    "weather": None,
                    "terrain": None,
                    "screens": []
                },
                "move_history": [],
                "last_updated": datetime.now().isoformat()
            }
            
            # Parse team reveals and moves
            in_battle = False
            for line in lines:
                if battle_id in line:
                    in_battle = True
                    
                if not in_battle:
                    continue
                    
                # Parse turn number
                turn_match = re.search(r'Turn (\d+)', line)
                if turn_match:
                    state["turn"] = int(turn_match.group(1))
                
                # Parse switch/active Pokémon
                switch_match = re.search(r'\|switch\|([^|]+)\|([^|]+)', line)
                if switch_match:
                    player = switch_match.group(1)
                    pokemon_data = switch_match.group(2)
                    pokemon_name = pokemon_data.split(',')[0]
                    
                    if player.startswith('p1'):
                        state["your_active"] = pokemon_name
                        if pokemon_name not in [p["species"] for p in state["your_team"]]:
                            state["your_team"].append({
                                "species": pokemon_name,
                                "hp": 100,
                                "status": None,
                                "revealed": True
                            })
                    elif player.startswith('p2'):
                        state["opponent_active"] = pokemon_name
                        if pokemon_name not in [p["species"] for p in state["opponent_team"]]:
                            state["opponent_team"].append({
                                "species": pokemon_name,
                                "hp": 100,
                                "status": None,
                                "revealed": True
                            })
                
                # Parse moves
                move_match = re.search(r'\|move\|([^|]+)\|([^|]+)', line)
                if move_match:
                    player = move_match.group(1)
                    move = move_match.group(2)
                    state["move_history"].append({
                        "turn": state["turn"],
                        "player": "you" if player.startswith('p1') else "opponent",
                        "move": move
                    })
                
                # Parse damage
                damage_match = re.search(r'\|-damage\|([^|]+)\|(\d+)/(\d+)', line)
                if damage_match:
                    player = damage_match.group(1)
                    current_hp = int(damage_match.group(2))
                    max_hp = int(damage_match.group(3))
                    hp_percent = (current_hp / max_hp * 100) if max_hp > 0 else 0
                    
                    if player.startswith('p1'):
                        for mon in state["your_team"]:
                            if mon["species"] == state["your_active"]:
                                mon["hp"] = round(hp_percent, 1)
                    elif player.startswith('p2'):
                        for mon in state["opponent_team"]:
                            if mon["species"] == state["opponent_active"]:
                                mon["hp"] = round(hp_percent, 1)
                
                # Parse weather
                weather_match = re.search(r'\|-weather\|([^|]+)', line)
                if weather_match:
                    state["field"]["weather"] = weather_match.group(1)
                
                # Parse terrain
                terrain_match = re.search(r'\|-fieldstart\|move: ([^|]+) Terrain', line)
                if terrain_match:
                    state["field"]["terrain"] = terrain_match.group(1)
                
                # Limit move history to last 10
                if len(state["move_history"]) > 10:
                    state["move_history"] = state["move_history"][-10:]
            
            return state
            
        except Exception as e:
            print(f"Error parsing battle state: {e}")
            return None
    
    def _extract_format(self, battle_id: str) -> str:
        """Extract format from battle ID"""
        match = re.search(r'battle-([^-]+)', battle_id)
        return match.group(1) if match else "unknown"
