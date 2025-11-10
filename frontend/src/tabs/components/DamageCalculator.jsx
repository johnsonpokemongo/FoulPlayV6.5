import React, { useState, useMemo } from "react";
import { Calculator } from "lucide-react";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";

export default function DamageCalculator({
  attackerData = null,
  defenderData = null,
  generation = 9
}) {
  const [attacker, setAttacker] = useState({
    species: attackerData?.species || "Garchomp",
    level: attackerData?.level || 50,
    item: attackerData?.item || "Choice Band",
    ability: attackerData?.ability || "Rough Skin",
    nature: attackerData?.nature || "Jolly",
    evs: attackerData?.evs || { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 },
    ivs: attackerData?.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  });

  const [defender, setDefender] = useState({
    species: defenderData?.species || "Blaziken",
    level: defenderData?.level || 50,
    item: defenderData?.item || "Leftovers",
    ability: defenderData?.ability || "Speed Boost",
    nature: defenderData?.nature || "Adamant",
    evs: defenderData?.evs || { hp: 252, atk: 0, def: 4, spa: 0, spd: 0, spe: 252 },
    ivs: defenderData?.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    curHP: defenderData?.curHP || 100,
  });

  const [move, setMove] = useState(attackerData?.move || "Earthquake");
  const [field, setField] = useState({
    weather: "",
    terrain: "",
    isReflect: false,
    isLightScreen: false,
    isCritical: false,
  });

  const calcResult = useMemo(() => {
    try {
      // Dynamically import the calculator
      const { calculate, Pokemon, Move, Field, Generations } = require('@smogon/calc');
      
      const gen = Generations.get(generation);
      
      const atkPokemon = new Pokemon(gen, attacker.species, {
        level: attacker.level,
        item: attacker.item,
        ability: attacker.ability,
        nature: attacker.nature,
        evs: attacker.evs,
        ivs: attacker.ivs,
        boosts: attacker.boosts,
      });

      const defPokemon = new Pokemon(gen, defender.species, {
        level: defender.level,
        item: defender.item,
        ability: defender.ability,
        nature: defender.nature,
        evs: defender.evs,
        ivs: defender.ivs,
        boosts: defender.boosts,
        curHP: Math.floor((defender.curHP / 100) * defPokemon.maxHP()),
      });

      const moveObj = new Move(gen, move, {
        isCrit: field.isCritical,
      });

      const fieldObj = new Field({
        weather: field.weather || undefined,
        terrain: field.terrain || undefined,
        isReflect: field.isReflect,
        isLightScreen: field.isLightScreen,
      });

      const result = calculate(gen, atkPokemon, defPokemon, moveObj, fieldObj);
      
      return {
        description: result.desc(),
        damage: result.damage,
        range: result.range(),
        koChance: result.kochance(),
      };
    } catch (error) {
      console.error("Calc error:", error);
      return {
        description: `Error: ${error.message}. Check Pokémon/move names.`,
        damage: [0],
        range: [0, 0],
        koChance: { n: 0, text: "" },
      };
    }
  }, [attacker, defender, move, field, generation]);

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Calculator size={20} className="text-purple-400" />
          <span>Damage Calculator</span>
        </div>
      }
      tooltip="Calculate damage for specific matchups"
    >
      <div className="space-y-4">
        {/* Attacker */}
        <div className="bg-blue-900 bg-opacity-20 border border-blue-500 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-300 mb-3">Attacker</h4>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Pokémon"
              value={attacker.species}
              onChange={(v) => setAttacker({...attacker, species: v})}
              placeholder="Garchomp"
            />
            <Input
              label="Move"
              value={move}
              onChange={setMove}
              placeholder="Earthquake"
            />
            <Input
              label="Item"
              value={attacker.item}
              onChange={(v) => setAttacker({...attacker, item: v})}
              placeholder="Choice Band"
            />
            <Input
              label="Ability"
              value={attacker.ability}
              onChange={(v) => setAttacker({...attacker, ability: v})}
              placeholder="Rough Skin"
            />
          </div>
        </div>

        {/* Defender */}
        <div className="bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-red-300 mb-3">Defender</h4>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Pokémon"
              value={defender.species}
              onChange={(v) => setDefender({...defender, species: v})}
              placeholder="Blaziken"
            />
            <Input
              label="Current HP %"
              type="number"
              value={String(defender.curHP)}
              onChange={(v) => setDefender({...defender, curHP: parseInt(v) || 100})}
              placeholder="100"
            />
            <Input
              label="Item"
              value={defender.item}
              onChange={(v) => setDefender({...defender, item: v})}
              placeholder="Leftovers"
            />
            <Input
              label="Ability"
              value={defender.ability}
              onChange={(v) => setDefender({...defender, ability: v})}
              placeholder="Speed Boost"
            />
          </div>
        </div>

        {/* Field Conditions */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Field Conditions</h4>
          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Weather"
              value={field.weather}
              onChange={(v) => setField({...field, weather: v})}
              options={["", "Sun", "Rain", "Sand", "Snow"]}
            />
            <Select
              label="Terrain"
              value={field.terrain}
              onChange={(v) => setField({...field, terrain: v})}
              options={["", "Electric", "Grassy", "Misty", "Psychic"]}
            />
            <div className="flex items-center gap-2 pt-6">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={field.isCritical}
                  onChange={(e) => setField({...field, isCritical: e.target.checked})}
                  className="rounded"
                />
                Critical Hit
              </label>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-4 border border-purple-500">
          <h4 className="text-sm font-semibold text-purple-300 mb-2">Result</h4>
          <div className="text-sm text-white font-mono mb-2 break-words whitespace-pre-wrap">{calcResult.description}</div>
          <div className="flex items-center gap-4 text-xs text-gray-300 flex-wrap">
            <div>
              <span className="text-gray-400">Damage:</span> {Array.isArray(calcResult.damage) ? `${calcResult.damage[0]}-${calcResult.damage[calcResult.damage.length - 1]}` : calcResult.damage}
            </div>
            <div>
              <span className="text-gray-400">Range:</span> {calcResult.range[0]}% - {calcResult.range[1]}%
            </div>
            {calcResult.koChance?.text && (
              <div>
                <span className="text-gray-400">KO:</span> {calcResult.koChance.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
