import re
import json
from copy import deepcopy, copy
import logging

import constants
from constants import BattleType
from data import all_move_json
from data import pokedex
from data.pkmn_sets import (
    SmogonSets,
    RandomBattleTeamDatasets,
    TeamDatasets,
    PredictedPokemonSet,
)

def _pm_should_skip_speed(battle):
    try:
        lm = getattr(getattr(battle.user, 'last_selected_move', None), 'move', None)
        name = getattr(lm, 'name', lm) if lm is not None else ''
        key = normalize_name(name or '')
        return key.startswith('switch')
    except Exception:
        return False

from fp.battle import Pokemon, Battler, Battle
from fp.battle import LastUsedMove
from fp.battle import DamageDealt
from fp.battle import StatRange
from fp.search.poke_engine_helpers import poke_engine_get_damage_rolls
from fp.helpers import normalize_name, type_effectiveness_modifier
from fp.helpers import get_pokemon_info_from_condition
from fp.helpers import calculate_stats
from fp.helpers import (
    is_not_very_effective,
    is_super_effective,
    is_neutral_effectiveness,
)
from fp.battle import boost_multiplier_lookup


logger = logging.getLogger(__name__)

MOVE_END_STRINGS = {"move", "switch", "upkeep", "-miss", ""}
ITEMS_REVEALED_ON_SWITCH_IN = [
    # boosterenergy technically only revealed if pkmn has quarkdrive/protosynthesis
    # but if they don't have that it doesn't matter
    "boosterenergy",
    "airballoon",
]
ABILITIES_REVEALED_ON_SWITCH_IN = [
    "intimidate",
    "pressure",
    "neutralizinggas",
    "sandstream",
    "drought",
    "drizzle",
    "snowwarning",
]

SIDE_CONDITION_DEFAULT_DURATION = {
    constants.REFLECT: 5,
    constants.LIGHT_SCREEN: 5,
    constants.AURORA_VEIL: 5,
    constants.SAFEGUARD: 5,
    constants.MIST: 5,
    constants.TAILWIND: 4,
}


def crit_rate_for_generation(generation):
    if generation == "gen1":
        return 205 / 105
    elif generation in [
        "gen2",
        "gen3",
        "gen4",
        "gen5",
    ]:
        return 2.0
    else:
        return 1.5


def can_have_priority_modified(battle, pokemon, move_name):
    return (
        "prankster"
        in [
            normalize_name(a)
            for a in pokedex[pokemon.name][constants.ABILITIES].values()
        ]
        or (move_name == "grassyglide" and battle.field == constants.GRASSY_TERRAIN)
        or (
            move_name in all_move_json
            and all_move_json[move_name][constants.CATEGORY] == constants.STATUS
            and "myceliummight"
            in [
                normalize_name(a)
                for a in pokedex[pokemon.name][constants.ABILITIES].values()
            ]
        )
    )


def can_have_speed_modified(battle, pokemon):
    return (
        (
            pokemon.item is None
            and "unburden"
            in [
                normalize_name(a)
                for a in pokedex[pokemon.name][constants.ABILITIES].values()
            ]
        )
        or (
            battle.weather == constants.RAIN
            and pokemon.ability is None
            and "swiftswim"
            in [
                normalize_name(a)
                for a in pokedex[pokemon.name][constants.ABILITIES].values()
            ]
        )
        or (
            battle.weather == constants.SUN
            and pokemon.ability is None
            and "chlorophyll"
            in [
                normalize_name(a)
                for a in pokedex[pokemon.name][constants.ABILITIES].values()
            ]
        )
        or (
            battle.weather == constants.SAND
            and pokemon.ability is None
            and "sandrush"
            in [
                normalize_name(a)
                for a in pokedex[pokemon.name][constants.ABILITIES].values()
            ]
        )
        or (
            battle.weather in constants.HAIL_OR_SNOW
            and pokemon.ability is None
            and "slushrush"
            in [
                normalize_name(a)
                for a in pokedex[pokemon.name][constants.ABILITIES].values()
            ]
        )
        or (
            battle.field == constants.ELECTRIC_TERRAIN
            and pokemon.ability is None
            and "surgesurfer"
            in [
                normalize_name(a)
                for a in pokedex[pokemon.name][constants.ABILITIES].values()
            ]
        )
        or (
            pokemon.status == constants.PARALYZED
            and pokemon.ability is None
            and "quickfeet"
            in [
                normalize_name(a)
                for a in pokedex[pokemon.name][constants.ABILITIES].values()
            ]
        )
    )


def remove_volatile(pkmn, volatile):
    pkmn.volatile_statuses = [vs for vs in pkmn.volatile_statuses if vs != volatile]


def unlikely_to_have_choice_item(move_name):
    try:
        move_dict = all_move_json[move_name]
    except KeyError:
        return False

    if (
        constants.BOOSTS in move_dict
        and move_dict[constants.CATEGORY] == constants.STATUS
    ):
        return True
    elif move_name in ["substitute", "roost", "recover"]:
        return True

    return False


def is_opponent(battle, split_msg):
    ident = str(split_msg[2]) if len(split_msg) > 2 else ""
    token = ident.split(":", 1)[0].strip()
    side = token[:2] if token.startswith(("p1","p2")) else None
    my_side = getattr(getattr(battle, "user", None), "id", None)
    if my_side in ("p1","p2") and side in ("p1","p2"):
        return side != my_side
    return token.startswith("p2")


def process_battle_updates(*args, **kwargs):
    return None
