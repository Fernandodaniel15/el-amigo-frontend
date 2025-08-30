import { ensureNotifs } from "../_store";

export default function handler(req, res) {
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Método no permitido");
  }

  const NOT = ensureNotifs();
  const { user = "usuario", ids = [] } = req.body || {};
  const list = NOT.byUser.get(user) || [];
  const now = Date.now();
  list.forEach(n => { if (ids.length === 0 || ids.includes(n.id)) n.readAt = n.readAt || now; });
  NOT.byUser.set(user, list);
  return res.status(200).json({ ok: true });
}
