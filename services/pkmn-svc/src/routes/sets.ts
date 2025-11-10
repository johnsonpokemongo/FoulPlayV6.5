import {Router} from 'express';
import {Teams} from '@pkmn/sets';
const r = Router();
r.post('/import', (req, res) => {
  const text = String(req.body.text || '');
  const teams = Teams.fromString(text);
  res.json(teams || []);
});
r.post('/export', (req, res) => {
  const team = req.body.team as any;
  const packed = Teams.packTeam(team as any);
  res.type('text/plain').send(packed || '');
});
export default r;
