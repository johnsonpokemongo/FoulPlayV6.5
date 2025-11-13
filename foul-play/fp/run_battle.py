from concurrent.futures import ThreadPoolExecutor
import json
import asyncio
from copy import deepcopy
import logging
import time

from data.pkmn_sets import RandomBattleTeamDatasets, TeamDatasets

def _rbts_load_safe(fmt: str):
    try:
        _rbts_load_safe(fmt)
    except Exception:
        return None

from data.pkmn_sets import SmogonSets
import constants
from constants import BattleType
from config import FoulPlayConfig, SaveReplay
from fp.battle import LastUsedMove, Pokemon, Battle
from fp.battle_modifier import process_battle_updates
from fp.helpers import normalize_name
from fp.search.main import find_best_move
from fp.websocket_client import PSWebsocketClient
from fp.epoke_client import epoke_enabled, epoke_suggest_move_async
from fp.decision_logger import log_hybrid_decision, log_mcts_decision
import re

logger = logging.getLogger(__name__)
_FP_EXECUTOR = None

active_battles = set()

def format_decision(battle, decision):
    if decision.startswith(constants.SWITCH_STRING + " "):
        switch_pokemon = decision.split("switch ")[-1]
        for pkmn in battle.user.reserve:
            if pkmn.name == switch_pokemon:
                return ["/switch {}".format(pkmn.index), str(battle.rqid)]
        raise ValueError("Tried to switch to: {}".format(switch_pokemon))
    
    tera = mega = False
    if decision.endswith("-tera"):
        decision = decision.replace("-tera", "")
        tera = True
    elif decision.endswith("-mega"):
        decision = decision.replace("-mega", "")
        mega = True
    
    message = "/choose move {}".format(decision)
    if battle.user.active.can_mega_evo and mega:
        message = "{} {}".format(message, constants.MEGA)
    elif battle.user.active.can_ultra_burst:
        message = "{} {}".format(message, constants.ULTRA_BURST)
    if battle.user.active.can_dynamax and all(p.hp == 0 for p in battle.user.reserve):
        message = "{} {}".format(message, constants.DYNAMAX)
    if tera:
        message = "{} {}".format(message, constants.TERASTALLIZE)
    if battle.user.active.get_move(decision).can_z:
        message = "{} {}".format(message, constants.ZMOVE)
    return [message, str(battle.rqid)]

def battle_is_finished(battle_tag, msg):
    return msg.startswith(">{}".format(battle_tag)) and (constants.WIN_STRING in msg or constants.TIE_STRING in msg) and constants.CHAT_STRING not in msg

async def async_pick_move(battle_copy):
    global _FP_EXECUTOR
    battle_id = getattr(battle_copy, 'battle_tag', 'unknown')
    turn = getattr(battle_copy, 'turn', 0)
    enable_epoke = FoulPlayConfig.enable_epoke
    
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    if _FP_EXECUTOR is None:
        _FP_EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="fp-search")
    
    if not enable_epoke:
        start_time = time.time()
        mcts_move = await loop.run_in_executor(_FP_EXECUTOR, find_best_move, battle_copy)
        search_time_ms = (time.time() - start_time) * 1000
        logger.info(f"[MCTS] Turn {turn}: {mcts_move}")
        log_mcts_decision(battle_id, turn, mcts_move, None, search_time_ms)
        return mcts_move
    
    start_time = time.time()
    mcts_task = loop.run_in_executor(_FP_EXECUTOR, find_best_move, battle_copy)
    epoke_task = epoke_suggest_move_async(battle_copy)
    
    try:
        mcts_move, epoke_result = await asyncio.gather(mcts_task, epoke_task)
    except Exception as e:
        logger.error(f"Error: {e}")
        mcts_move = await mcts_task
        epoke_result = None
    
    elapsed_ms = (time.time() - start_time) * 1000
    epoke_move = epoke_result.get('move') if epoke_result else None
    epoke_conf = epoke_result.get('confidence', 0.5) if epoke_result else 0.0
    
    if epoke_move and mcts_move == epoke_move:
        chosen_move = mcts_move
        chosen_source = "AGREEMENT"
        logger.info(f"[HYBRID ✓] Turn {turn}: {chosen_move}")
    elif epoke_move:
        chosen_move = mcts_move
        chosen_source = "MCTS"
        logger.info(f"[HYBRID ✗] Turn {turn}: MCTS={mcts_move}, EPoké={epoke_move}")
    else:
        chosen_move = mcts_move
        chosen_source = "MCTS"
        logger.warning(f"[HYBRID] EPoké failed: {chosen_move}")
    
    log_hybrid_decision(battle_id, turn, mcts_move, 0.7, epoke_move or "FAILED", epoke_conf, chosen_move, chosen_source, None, {"elapsed_ms": elapsed_ms})
    return chosen_move

async def handle_team_preview(battle, ps_websocket_client):
    battle_copy = deepcopy(battle)
    battle_copy.user.active = Pokemon.get_dummy()
    battle_copy.opponent.active = Pokemon.get_dummy()
    battle_copy.team_preview = True
    best_move = await async_pick_move(battle_copy)
    reserve = battle.user.reserve
    idx = int(best_move.split()[-1]) - 1
    pkmn_name = reserve[idx].name
    battle.user.last_selected_move = LastUsedMove("teampreview", "switch {}".format(pkmn_name), battle.turn)
    size_of_team = len(battle.user.reserve) + 1
    team_list_indexes = list(range(1, size_of_team))
    choice_digit = int(best_move.split()[-1])
    team_list_indexes.remove(choice_digit)
    message = ["/team {}{}|{}".format(choice_digit, "".join(str(x) for x in team_list_indexes), battle.rqid)]
    await ps_websocket_client.send_message(battle.battle_tag, message)

async def get_battle_tag_and_opponent(ps_websocket_client):
    while True:
        msg = await ps_websocket_client.receive_message()
        split_msg = msg.split("|")
        first_msg = split_msg[0]
        if "battle" in first_msg:
            battle_tag = first_msg.replace(">", "").strip()
            
            max_concurrent = FoulPlayConfig.max_concurrent_battles
            if battle_tag in active_battles:
                logger.debug(f"Battle {battle_tag} already tracked")
            elif len(active_battles) >= max_concurrent:
                logger.warning(
                    f"Battle limit reached ({len(active_battles)}/{max_concurrent}). "
                    f"Ignoring new battle: {battle_tag}"
                )
                continue
            else:
                active_battles.add(battle_tag)
                logger.info(f"Battle started: {battle_tag} ({len(active_battles)}/{max_concurrent} active)")
            
            user_name = FoulPlayConfig.username
            opponent_name = split_msg[4].replace(user_name, "").replace("vs.", "").strip()
            logger.info("Initialized {} against: {}".format(battle_tag, opponent_name))
            return battle_tag, opponent_name

async def start_battle_common(ps_websocket_client, pokemon_battle_type):
    battle_tag, opponent_name = await get_battle_tag_and_opponent(ps_websocket_client)
    
    try:
        if FoulPlayConfig.log_to_file:
            FoulPlayConfig.file_log_handler.do_rollover("{}_{}.log".format(battle_tag, opponent_name))
        battle = Battle(battle_tag)
        battle.opponent.account_name = opponent_name
        battle.pokemon_format = pokemon_battle_type
        battle.generation = pokemon_battle_type[:4]
        
        while True:
            msg = await ps_websocket_client.receive_message()
            if battle_is_finished(battle_tag, msg):
                winner = msg.split(constants.WIN_STRING)[-1].split("\n")[0].strip()
                await ps_websocket_client.leave_battle(battle_tag)
                return winner
            action_required = process_battle_updates(battle, msg.split('\n'))
            if action_required and not battle.wait:
                battle_copy = deepcopy(battle)
                best_move = await async_pick_move(battle_copy)
                choice = format_decision(battle, best_move)
                await ps_websocket_client.send_message(battle.battle_tag, choice)
    finally:
        if battle_tag in active_battles:
            active_battles.discard(battle_tag)
            logger.info(f"Battle ended: {battle_tag} ({len(active_battles)}/{FoulPlayConfig.max_concurrent_battles} active)")

async def pokemon_battle(ps_websocket_client, pokemon_format, team_dict):
    if "random" in pokemon_format.lower():
        SmogonSets.MODE = "randoms"
        _rbts_load_safe(pokemon_format)
    else:
        SmogonSets.MODE = "standard"
        TeamDatasets.load()
    
    return await start_battle_common(ps_websocket_client, pokemon_format)
