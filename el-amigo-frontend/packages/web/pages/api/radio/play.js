import { ensureDB, seedOnce } from "../social/_db";
export default function handler(req, res) {
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end("Method Not Allowed"); }
  const DB = ensureDB(); seedOnce(DB);
  const { stationId } = req.body || {};
  const r = DB.radios.find(x => x.id === Number(stationId));
  if (!r) return res.status(404).json({ error: "radio no encontrada" });
  r.listeners = Math.max(0, (r.listeners || 0) + 1);
  return res.status(200).json({ ok: true, radio: r });
}
