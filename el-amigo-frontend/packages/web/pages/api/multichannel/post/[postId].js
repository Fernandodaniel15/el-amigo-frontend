// packages/web/pages/api/multichannel/post/[postId].js
// Devuelve el estado de un job multicanal.
function ensureDB() {
  if (!global.MULTI_DB) {
    global.MULTI_DB = {
      nextId: 1,
      posts: new Map(),
    };
  }
  return global.MULTI_DB;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  // no-cache
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const DB = ensureDB();
  const { postId } = req.query;
  const id = Number(postId);

  if (!DB.posts.has(id)) {
    return res.status(404).json({ error: "Post no encontrado" });
  }

  const post = DB.posts.get(id);
  return res.status(200).json({
    id: post.id,
    text: post.text,
    mediaUrls: post.mediaUrls,
    created_at: post.created_at,
    scheduled_at: post.scheduled_at,
    status: post.status,
    channels: post.channels,
  });
}
