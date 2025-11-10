import express from "express";
import { z } from "zod";

const app = express();
app.use(express.json({ limit: "1mb" }));

const InferInput = z.object({
  battleId: z.string().optional(),
  turn: z.number().int().nonnegative().optional(),
  log: z.array(z.string()).optional(),
  state: z.unknown().optional() // roomstate snapshot or parsed observation
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// Stub: returns echo + empty inferences; swap to real EPoke later.
app.post("/infer", (req, res) => {
  const parsed = InferInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }
  const input = parsed.data;
  const result = {
    ok: true,
    inferences: {
      p1: { items: [], abilities: [], moves: [], spreads: [] },
      p2: { items: [], abilities: [], moves: [], spreads: [] }
    },
    confidence: {},
    echo: { turn: input.turn ?? null }
  };
  return res.json(result);
});

const PORT = Number(process.env.PORT || 8788);
app.listen(PORT, "127.0.0.1", () => {
  console.log(JSON.stringify({ ok: true, service: "epoke-svc", port: PORT }));
});
