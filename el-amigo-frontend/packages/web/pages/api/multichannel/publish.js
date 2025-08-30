// packages/web/pages/api/multichannel/publish.js
// Crea un job multicanal y dispara el "worker" in-memory (mock).
import { enqueuePost } from "../../../lib/multichannel/worker";

function ensureDB() {
  if (!global.MULTI_DB) {
    global.MULTI_DB = {
      nextId: 1,
      posts: new Map(), // id -> post
    };
  }
  return global.MULTI_DB;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  // no-cache
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const DB = ensureDB();

  const {
    text = "",
    mediaUrls = [],
    channels = [],
    scheduledAt = null,
    authorEmail = "usuario@example.com",
    authorName = "usuario",
  } = req.body || {};

  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: "Texto requerido" });
  }
  if (!Array.isArray(channels) || channels.length === 0) {
    return res.status(400).json({ error: "Debe elegir al menos un canal" });
  }

  const id = DB.nextId++;
  const nowIso = new Date().toISOString();

  const post = {
    id,
    text: String(text).trim(),
    mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
    created_at: nowIso,
    scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    author: { email: authorEmail, name: authorName },
    status: scheduledAt ? "scheduled" : "queued",
    channels: channels.map((ch) => ({
      channel: ch,
      status: scheduledAt ? "scheduled" : "queued",
      remotePostId: null,
      errorMessage: null,
    })),
  };

  DB.posts.set(id, post);

  // Encolamos en el "worker" (mock). Si está programado, se ejecuta más tarde.
  enqueuePost(id);

  return res.status(201).json({
    ok: true,
    postId: id,
    status: post.status,
    perChannel: post.channels,
  });
}
