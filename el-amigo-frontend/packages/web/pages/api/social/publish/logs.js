// GET /api/social/publish/logs?postId=123
// Devuelve los logs/auditoría por post (lee global.PUB_AUDIT)

function ensureAudit() {
  if (!global.PUB_AUDIT)
    global.PUB_AUDIT = { items: [], byPost: new Map(), nextId: 1 };
  return global.PUB_AUDIT;
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma","no-cache"); res.setHeader("Expires","0"); res.setHeader("Surrogate-Control","no-store");

  const { postId } = req.query || {};
  const AUD = ensureAudit();

  if (!postId) return res.status(400).json({ error: "postId requerido" });

  const logs = AUD.byPost.get(Number(postId)) || [];
  return res.status(200).json({ ok: true, logs });
}
