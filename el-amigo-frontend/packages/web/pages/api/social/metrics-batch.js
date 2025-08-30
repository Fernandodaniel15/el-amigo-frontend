// GET  /api/social/metrics-batch?ids=1,2,3
// POST /api/social/metrics-batch { postIds?: number[] }
import { ensureDB, seedOnce } from "./_db.js";

function mkMetricsSeeded(id) {
  const t = Date.now();
  const base = (id * 9301 + 49297) % 233280;
  const rand = (n) => ((base + n * 12345 + (t % 5000)) % 100) / 100;

  const viewersNow   = Math.max(0, Math.round(rand(1) * 200));
  const views        = Math.round(50 + rand(2) * 2000);
  const hook         = Math.round(40 + rand(3) * 50);
  const retention    = Math.round(30 + rand(4) * 60);
  const clickQuality = Math.round(20 + rand(5) * 70);
  const cpm          = +(0.5 + rand(6) * 5).toFixed(2); // número

  const joy     = Math.round(40 + rand(7) * 50);
  const anger   = Math.max(0, Math.round(5 + rand(8) * 20));
  const neutral = Math.max(0, 100 - joy - anger);

  return { viewersNow, views, hook, retention, clickQuality, cpm, sentiment: { joy, anger, neutral } };
}

function readIdsParam(req) {
  const idsStr = String(req.query.ids || "").trim();
  if (!idsStr) return [];
  return idsStr.split(",").map((s) => Number(s)).filter((n) => !Number.isNaN(n));
}

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache"); res.setHeader("Expires", "0"); res.setHeader("Surrogate-Control", "no-store");

  const DB = ensureDB(); seedOnce(DB);

  if (req.method === "GET") {
    const ids = readIdsParam(req);
    if (ids.length === 0) {
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(400).json({ error: "ids requerido" });
    }
    const metricsById = {};
    for (const id of ids) {
      const post = DB.posts.find((p) => p.id === id);
      metricsById[id] = post?.liveMetrics || mkMetricsSeeded(id);
    }
    return res.status(200).json({ ok: true, metricsById });
  }

  if (req.method === "POST") {
    const ids = Array.isArray(req.body?.postIds) && req.body.postIds.length ? req.body.postIds : DB.posts.map((p) => p.id);
    const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
    const rnd = (n) => n + Math.floor(Math.random() * 5) - 2;

    DB.posts = DB.posts.map((p) => {
      if (!ids.includes(p.id)) return p;
      const m = p.liveMetrics || { viewersNow: 0, views: 0, hook: 50, retention: 50, clickQuality: 50, cpm: 1.2, sentiment: { joy: 50, anger: 10, neutral: 40 } };
      m.viewersNow   = Math.max(0, rnd(m.viewersNow));
      m.views        = m.views + Math.max(0, Math.floor(Math.random() * 7));
      m.hook         = clamp(rnd(m.hook));
      m.retention    = clamp(rnd(m.retention));
      m.clickQuality = clamp(rnd(m.clickQuality));
      m.cpm          = Math.max(0.2, +(m.cpm + (Math.random() * 0.06 - 0.03)).toFixed(2));
      m.sentiment = { joy: clamp(rnd(m.sentiment.joy)), anger: clamp(rnd(m.sentiment.anger)), neutral: clamp(rnd(m.sentiment.neutral)) };
      return { ...p, liveMetrics: m };
    });

    return res.status(200).json({ ok: true, updated: ids.length });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end("Method Not Allowed");
}
