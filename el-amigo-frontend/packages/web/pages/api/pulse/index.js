// GET lista con agregados; POST crea tema { title }
import { ensureDB, seedOnce } from "../social/_db";

export default function handler(req, res) {
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  const DB = ensureDB(); seedOnce(DB);

  if (req.method === "GET") {
    const topics = DB.pulse.topics.map(t => {
      const total = (t.votes.love||0) + (t.votes.no_interest||0) + (t.votes.disapprove||0);
      const pct = (n) => total ? Math.round((n*100)/total) : 0;
      return { id: t.id, title: t.title, votes: t.votes, total, pct: { love: pct(t.votes.love), no_interest: pct(t.votes.no_interest), disapprove: pct(t.votes.disapprove) } };
    });
    return res.status(200).json({ ok: true, items: topics });
  }

  if (req.method === "POST") {
    const { title } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: "title requerido" });
    const t = { id: DB.pulse.nextTopicId++, title: String(title).trim(), votes: { love:0, no_interest:0, disapprove:0 }, byUser: {} };
    DB.pulse.topics.push(t);
    return res.status(201).json({ ok: true, topic: t });
  }

  res.setHeader("Allow", ["GET","POST"]); return res.status(405).end("Method Not Allowed");
}
