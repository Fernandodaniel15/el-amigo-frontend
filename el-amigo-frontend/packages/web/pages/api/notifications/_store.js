// packages/web/pages/api/_store.js
// Store de desarrollo en memoria (compartido por varios endpoints)

// ---- (opcional/compat) Posts mock ----
let _nextPostId = 1;
export const posts = [];
export function createPost({ author = "anon", text }) {
  const p = {
    id: _nextPostId++,
    author,
    text: String(text || ""),
    createdAt: Date.now(),
    reactions: { like: 0, dislike: 0, favorite: 0, not_interested: 0 },
    userReactions: {},
    comments: [],
    channelStates: {},
  };
  posts.unshift(p);
  return p;
}
export function findPost(id) {
  return posts.find((p) => p.id === Number(id));
}

// ---- Notificaciones (NUEVO) ----
export function ensureNotifs() {
  if (!global.NOTIFS) {
    global.NOTIFS = { byUser: new Map(), nextId: 1 };
  }
  return global.NOTIFS;
}
export function pushNotif(user, message) {
  const NOT = ensureNotifs();
  const item = { id: NOT.nextId++, message, at: Date.now(), readAt: null };
  const list = NOT.byUser.get(user) || [];
  list.push(item);
  NOT.byUser.set(user, list);
  return item;
}

// Compatibilidad con código antiguo (si quedara algún import viejo)
export const notifByUser = ensureNotifs().byUser;
export function addNotif(user, message) { return pushNotif(user, message); }
export function getNotifs(user) {
  const NOT = ensureNotifs();
  const list = NOT.byUser.get(user) || [];
  return { items: list, unread: list.filter((x) => !x.readAt).length };
}
export function markAllRead(user) {
  const NOT = ensureNotifs();
  const list = NOT.byUser.get(user) || [];
  const now = Date.now();
  list.forEach((n) => { n.readAt = n.readAt || now; });
  NOT.byUser.set(user, list);
}

// ---- (opcional/compat) Métricas mock ----
export const metrics = new Map();
export function bumpMetrics(ids = []) {
  const out = {};
  ids.forEach((id) => {
    const cur = metrics.get(id) || {
      viewersNow: 0, views: 0, hook: 0, retention: 0, clickQuality: 0, cpm: 0,
      sentiment: { joy: 0, anger: 0, neutral: 100 }
    };
    const jitter = (v, step, min = 0, max = 100) =>
      Math.min(max, Math.max(min, Math.round(v + (Math.random() * 2 - 1) * step)));
    cur.viewersNow = jitter(cur.viewersNow, 5, 0, 500);
    cur.views += Math.floor(Math.random() * 8);
    cur.hook = jitter(cur.hook, 2);
    cur.retention = jitter(cur.retention, 2);
    cur.clickQuality = jitter(cur.clickQuality, 2);
    cur.cpm = Math.max(0, Math.round(cur.cpm + (Math.random() * 2 - 1)));
    const s = cur.sentiment;
    const delta = Math.floor(Math.random() * 3) - 1;
    s.joy = jitter(s.joy + delta, 2);
    s.anger = jitter(s.anger - delta, 2);
    s.neutral = Math.max(0, 100 - s.joy - s.anger);
    metrics.set(Number(id), cur);
    out[id] = cur;
  });
  return out;
}
