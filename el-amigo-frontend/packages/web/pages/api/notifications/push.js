import { pushNotif } from "../_store";

export default function handler(req, res) {
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Método no permitido");
  }

  const { user = "usuario", message = "" } = req.body || {};
  const item = pushNotif(user, message || "Notificación");
  return res.status(200).json({ ok: true, item });
}
