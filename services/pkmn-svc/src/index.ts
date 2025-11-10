import express from 'express';
import cors from 'cors';
import health from './routes/health';
import dex from './routes/dex';
import sets from './routes/sets';
import smogon from './routes/smogon';
import dmg from './routes/dmg';

const app = express();
app.use(cors());
app.use(express.json({limit:'1mb'}));

app.use('/health', health);
app.use('/dex', dex);
app.use('/sets', sets);
app.use('/smogon', smogon);
app.use('/dmg', dmg);

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`pkmn-svc listening on :${PORT}`));
