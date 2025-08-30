// POST /api/social/feed/react
// Body: { postId, type }  header: "X-User-Id": <user>
import { ensureDB, seedOnce } from "../_db.js";

export default function handler(req, res) {
  const DB = ensureDB(); seedOnce(DB);

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  // no-cache
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  const { postId, type } = req.body || {};
  const userId = req.headers["x-user-id"] || "usuario";

  const post = DB.posts.find((p) => p.id === Number(postId));
  if (!post) return res.status(404).json({ error: "Post no encontrado" });

  post.reactions = post.reactions || { like: 0, dislike: 0, favorite: 0, not_interested: 0 };
  post.userReactions = post.userReactions || {};

  const prev = post.userReactions[userId] || null;
  if (prev === type) return res.status(200).json({ ok: true, post });

  if (prev && post.reactions[prev] > 0) post.reactions[prev] -= 1;
  post.userReactions[userId] = type;
  if (post.reactions[type] == null) post.reactions[type] = 0;
  post.reactions[type] += 1;

  return res.status(200).json({ ok: true, post });
}
