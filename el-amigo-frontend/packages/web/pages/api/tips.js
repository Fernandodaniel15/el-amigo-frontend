// POST /api/tips { kind: "post"|"radio", id: number, amount: number, from?: string }
import { ensureDB, seedOnce, findPost } from "./social/_db";
import { pushNotif } from "./_store";

export default function handler(req, res) {
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end("Method Not Allowed"); }

  const DB = ensureDB(); seedOnce(DB);
  const { kind, id, amount = 1, from } = req.body || {};
  const user = from || req.headers["x-user-id"] || "usuario";
  const amt = Math.max(1, Number(amount) || 1);

  if (kind === "post") {
    const p = findPost(DB, id);
    if (!p) return res.status(404).json({ error: "post no encontrado" });
    p.income = p.income || { tips: 0, total: 0 };
    p.income.tips += 1; p.income.total += amt;
    if (p.author) pushNotif(p.author, `${user} te dejó una propina ($${amt}) en tu post.`);
    return res.status(200).json({ ok: true, income: p.income });
  }

  if (kind === "radio") {
    const r = DB.radios.find(x => x.id === Number(id));
    if (!r) return res.status(404).json({ error: "radio no encontrada" });
    r.income = r.income || { tips: 0, total: 0 };
    r.income.tips += 1; r.income.total += amt;
    if (r.owner) pushNotif(r.owner, `${user} te dejó una propina ($${amt}) en la radio "${r.name}".`);
    return res.status(200).json({ ok: true, income: r.income });
  }

  return res.status(400).json({ error: "kind inválido" });
}
