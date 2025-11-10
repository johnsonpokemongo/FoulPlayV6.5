import {Router} from 'express';
import {Smogon} from '@pkmn/smogon';
import {gen} from '../util/gens';
const r = Router();
const gfetch: any = (globalThis as any).fetch;
const fetcher = async (url: string) => {
  const resp = await gfetch(url);
  return { json: async () => await resp.json() };
};
const api = new Smogon(fetcher, true);
r.get('/analyses/:format/:pokemon', async (req, res) => {
  const fmt = req.params.format || 'gen9ou';
  const m = fmt.match(/\d+/);
  const n = m ? Number(m[0]) : 9;
  const g = gen(n);
  const mon = req.params.pokemon;
  const data = await api.analyses(g as any, mon as any);
  res.json(data);
});
r.get('/teams/:format', async (req, res) => {
  const fmt = req.params.format || 'gen9ou';
  const teams = await api.teams(fmt as any);
  res.json(teams);
});
export default r;
