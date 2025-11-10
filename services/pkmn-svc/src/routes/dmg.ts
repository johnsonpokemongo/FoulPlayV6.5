import {Router} from 'express';
import * as calc from '@smogon/calc';
import {gen} from '../util/gens';
const r = Router();
r.post('/calc', (req, res) => {
  const g = gen(req.body.gen || 9);
  const an = req.body.attacker?.species || req.body.attacker?.name || 'Garchomp';
  const dn = req.body.defender?.species || req.body.defender?.name || 'Landorus-Therian';
  const ao = req.body.attacker?.opts || {};
  const do_ = req.body.defender?.opts || {};
  const mv = req.body.move || 'Earthquake';
  const field = new calc.Field(req.body.field || {});
  const A = new calc.Pokemon(g, an, ao);
  const D = new calc.Pokemon(g, dn, do_);
  const M = new calc.Move(g, mv);
  const result = calc.calculate(g, A, D, M, field);
  const dmg = result.damage as number | number[];
  const rolls: number[] = Array.isArray(dmg) ? (dmg as number[]) : (typeof dmg === 'number' ? [dmg as number] : []);
  const min = rolls.length ? Math.min.apply(null, rolls) : null;
  const max = rolls.length ? Math.max.apply(null, rolls) : null;
  let desc = "";
  try { desc = result.desc(); } catch {}
  res.json({desc, min, max, rolls});
});
export default r;
