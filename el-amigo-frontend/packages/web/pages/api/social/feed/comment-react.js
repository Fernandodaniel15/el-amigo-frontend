// POST /api/social/feed/comment-react
// Body: { postId, commentIndex, type, userId? }
import { ensureDB, seedOnce, findPost } from "../_db.js";

export default function handler(req, res) {
  // no-cache
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const DB = ensureDB(); seedOnce(DB);

  const { postId, commentIndex, type, userId: bodyUser } = req.body || {};
  const userId = bodyUser || req.headers["x-user-id"] || "usuario";

  const post = findPost(DB, postId);
  if (!post) return res.status(404).json({ error: "Post no encontrado" });

  const idx = Number(commentIndex);
  if (Number.isNaN(idx) || idx < 0 || idx >= (post.comments?.length || 0)) {
    return res.status(400).json({ error: "Índice de comentario inválido" });
  }

  const comment = post.comments[idx];
  comment.reactions = comment.reactions || { like: 0, dislike: 0, favorite: 0, not_interested: 0 };
  comment.userReactions = comment.userReactions || {};

  const prev = comment.userReactions[userId] || null;
  if (prev === type) return res.status(200).json({ ok: true, comment });

  if (prev && comment.reactions[prev] > 0) comment.reactions[prev] -= 1;
  comment.userReactions[userId] = type;
  if (comment.reactions[type] == null) comment.reactions[type] = 0;
  comment.reactions[type] += 1;

  return res.status(200).json({ ok: true, comment });
}
