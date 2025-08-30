// /pages/api/social/feed/comment.js
import { ensureDB, seedOnce } from "../_db";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache"); res.setHeader("Expires", "0"); res.setHeader("Surrogate-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const DB = ensureDB(); seedOnce(DB);

  const user = req.headers["x-user-id"] || "anon";
  const { postId, text = "", whisper = false, images = [], audioUrl = null } = req.body || {};

  const hasText  = !!String(text || "").trim();
  const hasImgs  = Array.isArray(images) && images.length > 0;
  const hasAudio = typeof audioUrl === "string" && !!audioUrl.trim();

  if (!hasText && !hasImgs && !hasAudio) {
    return res.status(400).json({ error: "El comentario debe tener texto, imagen o audio." });
  }

  const p = DB.posts.find(pp => pp.id === Number(postId));
  if (!p) return res.status(404).json({ error: "post no encontrado" });

  p.comments = p.comments || [];
  p.comments.push({
    author: String(user),
    text: String(text || ""),
    whisper: !!whisper,
    images: hasImgs ? images.slice() : [],
    audioUrl: hasAudio ? String(audioUrl) : null,
    reactions: { like: 0, dislike: 0, favorite: 0, not_interested: 0 },
    userReactions: {},
  });

  return res.status(200).json({ ok: true, count: p.comments.length });
}
