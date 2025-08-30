// pages/api/notifications/index.js
import { ensureNotifs } from "../_store";

export default function handler(req, res) {
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  const NOT = ensureNotifs();
  const user = String(req.query.user || "usuario");
  const items = NOT.byUser.get(user) || [];
  const unread = items.filter(n => !n.readAt).length;
  return res.status(200).json({ items, unread });
}
