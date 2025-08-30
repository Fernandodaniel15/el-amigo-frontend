// Simple store en memoria para desarrollo

let _nextPostId = 1;

/** @type {Array<{
 *  id:number, author:string, text:string, createdAt:number,
 *  reactions: Record<string, number>,
 *  userReactions: Record<string,string>,
 *  comments: Array<{
 *    author:string, text:string, whisper?:boolean,
 *    reactions: Record<string, number>,
 *    userReactions: Record<string,string>
 *  }>,
 *  channelStates: Record<string,{status:string, placement?:string, detail?:string}>
 * }>} */
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
    channelStates: {},     // se completa al publicar
  };
  posts.unshift(p);
  return p;
}

export function findPost(id) {
  return posts.find(p => p.id === Number(id));
}

// ===== Notificaciones (unificado) =====
export function ensureNotifs() {
  if (!global.NOTIFS) global.NOTIFS = { byUser: new Map(), nextId: 1 };
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

// --- Compatibilidad con código viejo (por si en algún lugar usabas estos nombres):
export const notifByUser = ensureNotifs().byUser; // sigue siendo un Map
export function addNotif(user, message) { return pushNotif(user, message); }
export function getNotifs(user) {
  const list = ensureNotifs().byUser.get(user) || [];
  return { items: list, unread: list.filter(n => !n.readAt).length };
}
export function markAllRead(user) {
  const list = ensureNotifs().byUser.get(user) || [];
  const now = Date.now();
  list.forEach(n => { if (!n.readAt) n.readAt = now; });
  ensureNotifs().byUser.set(user, list);
}


// ===== Métricas mock =====
/** @type {Map<number, any>} */
export const metrics = new Map();

export function bumpMetrics(ids = []) {
  const out = {};
  ids.forEach(id => {
    const cur = metrics.get(id) || {
      viewersNow: 0, views: 0, hook: 0, retention: 0, clickQuality: 0, cpm: 0,
      sentiment: { joy: 0, anger: 0, neutral: 100 }
    };
    // pequeña deriva aleatoria
    const jitter = (v, step, min = 0, max = 100) =>
      Math.min(max, Math.max(min, Math.round(v + (Math.random()*2-1)*step)));

    cur.viewersNow = jitter(cur.viewersNow, 5, 0, 500);
    cur.views      = cur.views + Math.floor(Math.random() * 8);
    cur.hook       = jitter(cur.hook, 2);
    cur.retention  = jitter(cur.retention, 2);
    cur.clickQuality = jitter(cur.clickQuality, 2);
    cur.cpm        = Math.max(0, Math.round(cur.cpm + (Math.random()*2-1)));

    // sentimiento estable pero con variación leve
    const s = cur.sentiment;
    const delta = Math.floor(Math.random()*3)-1;
    s.joy = jitter(s.joy + delta, 2);
    s.anger = jitter(s.anger - delta, 2);
    s.neutral = 100 - s.joy - s.anger;

    metrics.set(Number(id), cur);
    out[id] = cur;
  });
  return out;
}
