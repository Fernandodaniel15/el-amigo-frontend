// API: GET /api/social/feed/metrics?postId=<id>
// Métricas mock (nuestras) para mostrar en vivo.

function ensureDB() {
  if (!global.FEED_DB) global.FEED_DB = { posts: [], nextId: 1, seeded: false };
  return global.FEED_DB;
}

function pseudoRand(n) {
  // valor estable pero "vivo" usando el tiempo
  const t = Date.now() / 1000;
  return Math.abs(Math.sin(t / (5 + n))) * 100;
}

export default function handler(req, res) {
  ensureDB();
  const { postId } = req.query;
  const base = Number(postId) || 1;

  const viewersNow = Math.floor(3 + pseudoRand(base) / 5);
  const views = Math.floor(20 + pseudoRand(base + 1));
  const hook = Math.round(30 + (pseudoRand(base + 2) % 60)); // 0..100
  const retention = Math.round(20 + (pseudoRand(base + 3) % 70));
  const clickQuality = Math.round(10 + (pseudoRand(base + 4) % 80));
  const cpm = Number((0.5 + (pseudoRand(base + 5) % 150) / 10).toFixed(2));
  const sentiment = {
    joy: Math.round(pseudoRand(base + 6) % 100),
    anger: Math.round(pseudoRand(base + 7) % 100),
    neutral: Math.round(pseudoRand(base + 8) % 100),
  };

  return res.status(200).json({
    ok: true,
    metrics: { viewersNow, views, hook, retention, clickQuality, cpm, sentiment },
  });
}
