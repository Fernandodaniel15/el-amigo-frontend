// /pages/api/social/feed/index.js
import { ensureDB, seedOnce } from "../_db.js";

export const config = { api: { bodyParser: { sizeLimit: "50mb" } } };

function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export default function handler(req, res) {
  // no-cache
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  const DB = ensureDB(); seedOnce(DB);

  if (req.method === "GET") {
    const { limit = 6, cursor = "", orderBy = "recent", tag = "" } = req.query || {};
    const lim = num(limit, 6);

    let items = DB.posts.slice();

    if (tag) {
      const t = String(tag).toLowerCase();
      items = items.filter(p => String(p.text || "").toLowerCase().includes(`#${t}`));
    }

    if (orderBy === "top") {
      items.sort((a,b) => (b.reactions?.like || 0) - (a.reactions?.like || 0));
    } else if (orderBy === "comments") {
      items.sort((a,b) => (b.comments?.length || 0) - (a.comments?.length || 0));
    } else {
      items.sort((a,b) => b.createdAt - a.createdAt);
    }

    const start = cursor ? (items.findIndex(p => String(p.id) === String(cursor)) + 1) : 0;
    const page = items.slice(start, start + lim);
    const nextCursor = (start + lim) < items.length ? String(page[page.length - 1]?.id) : null;

    return res.status(200).json({ items: page, nextCursor });
  }

  if (req.method === "POST") {
    const user = req.headers["x-user-id"] || "usuario";
    const { text = "", images = [], videos = [], audioUrl = null } = req.body || {};

    const hasText   = !!String(text || "").trim();
    const hasImgs   = Array.isArray(images) && images.length > 0;
    const hasVids   = Array.isArray(videos) && videos.length > 0;
    const hasAudio  = typeof audioUrl === "string" && !!audioUrl.trim();

    if (!hasText && !hasImgs && !hasVids && !hasAudio) {
      return res.status(400).json({ error: "El post debe tener texto, imagen, video o audio." });
    }

    const id = (DB.posts.reduce((m,p)=>Math.max(m,p.id), 0) || 0) + 1;

    const post = {
      id,
      author: String(user),
      text: String(text || ""),
      images: hasImgs ? images.slice() : [],
      videos: hasVids ? videos.slice() : [],
      audioUrl: hasAudio ? String(audioUrl) : null,
      createdAt: Date.now(),
      reactions: { like: 0, dislike: 0, favorite: 0, not_interested: 0 },
      userReactions: {},
      comments: [],
      channelStates: {},
      income: { tips: 0, total: 0 },
    };

    DB.posts.unshift(post);
    return res.status(200).json({ ok: true, post });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end("Method Not Allowed");
}
