// POST /api/pulse/vote { topicId, choice: "love"|"no_interest"|"disapprove" }
import { ensureDB, seedOnce } from "../social/_db";

export default function handler(req, res) {
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end("Method Not Allowed"); }

  const DB = ensureDB(); seedOnce(DB);
  const { topicId, choice } = req.body || {};
  const user = req.headers["x-user-id"] || "usuario";
  const t = DB.pulse.topics.find(x => x.id === Number(topicId));
  if (!t) return res.status(404).json({ error: "tema no encontrado" });
  if (!["love","no_interest","disapprove"].includes(choice)) return res.status(400).json({ error: "choice inválido" });

  // permite cambiar voto
  const prev = t.byUser[user] || null;
  if (prev) t.votes[prev] = Math.max(0, (t.votes[prev]||0) - 1);
  t.byUser[user] = choice;
  t.votes[choice] = (t.votes[choice]||0) + 1;

  const total = (t.votes.love||0) + (t.votes.no_interest||0) + (t.votes.disapprove||0);
  const pct = (n) => total ? Math.round((n*100)/total) : 0;

  return res.status(200).json({ ok: true, topic: { id:t.id, title:t.title, votes:t.votes, total, pct:{ love:pct(t.votes.love), no_interest:pct(t.votes.no_interest), disapprove:pct(t.votes.disapprove) } } });
}
