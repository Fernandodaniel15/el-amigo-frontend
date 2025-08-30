// API: GET /api/social/feed/receipts?postId=<id>
// Devuelve recibos de entrega/lectura por @menciones (mock).

export default function handler(req, res) {
  const { postId } = req.query;
  const seed = Number(postId) || 1;

  const people = ["@ana", "@luis", "@cami", "@tomi", "@vale", "@mike"];
  const subset = people.slice(0, (seed % people.length) + 1);

  const out = subset.map((h, i) => ({
    handle: h,
    delivered: true,
    read: (seed + i) % 2 === 0, // alterna
    at: Date.now() - (i + 1) * 1000 * 30,
  }));

  return res.status(200).json({ ok: true, receipts: out });
}
