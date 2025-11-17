const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ ok: true, service: 'epoke', model: 'stub' }));

function score(body) {
  const moves = Array.isArray(body && body.moves) ? body.moves : [];
  return { ok: true, model: 'stub', scores: moves.map(() => 0.5) };
}

app.post('/score', (req, res) => res.json(score(req.body)));
app.post('/evaluate', (req, res) => res.json(score(req.body)));
app.post('/predict', (req, res) => res.json(score(req.body)));
app.get('/', (req, res) => res.json({ ok: true, endpoints: ['/health','/score','/evaluate','/predict'] }));

const PORT = 8788;
app.listen(PORT, '127.0.0.1', () => process.stdout.write(`epoke-svc listening on http://127.0.0.1:${PORT}\n`));
