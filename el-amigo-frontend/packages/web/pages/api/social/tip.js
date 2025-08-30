// POST /api/social/tip { postId:number, amount:number, user?:string }
import { ensureDB, seedOnce, findPost } from "./_db";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end("Method Not Allowed"); }

  const DB = ensureDB(); seedOnce(DB);

  const { postId, amount = 0 } = req.body || {};
  const n = Number(amount);
  if (!postId || Number.isNaN(n) || n <= 0) return res.status(400).json({ error: "Datos inválidos" });

  const post = findPost(DB, postId);
  if (!post) return res.status(404).json({ error: "Post no encontrado" });

  post.income = post.income || { tips: 0, total: 0 };
  post.income.tips += 1;
  post.income.total += n;

  return res.status(200).json({ ok: true, income: post.income });
}
