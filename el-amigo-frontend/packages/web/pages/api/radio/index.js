// GET lista, POST crea nueva radio { name }
import { ensureDB, seedOnce } from "../social/_db";

export default function handler(req, res) {
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  const DB = ensureDB(); seedOnce(DB);

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, items: DB.radios });
  }

  if (req.method === "POST") {
    const user = req.headers["x-user-id"] || "usuario";
    const { name } = req.body || {};
    const r = { id: DB.nextRadioId++, name: name || "Mi Radio", owner: user, streamUrl: "", listeners: 0, income: { tips: 0, total: 0 } };
    DB.radios.push(r);
    return res.status(201).json({ ok: true, radio: r });
  }

  res.setHeader("Allow", ["GET","POST"]); return res.status(405).end("Method Not Allowed");
}
