import {Router} from 'express';
import {Dex} from '@pkmn/dex';
const r = Router();
r.get('/species/:id', (req,res)=>res.json(Dex.species.get(req.params.id)));
r.get('/move/:id', (req,res)=>res.json(Dex.moves.get(req.params.id)));
r.get('/item/:id', (req,res)=>res.json(Dex.items.get(req.params.id)));
export default r;
