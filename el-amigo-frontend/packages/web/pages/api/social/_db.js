// DB del feed en memoria (dev only) — fuente única de verdad

export function ensureDB() {
  if (!global.FEED_DB) {
    global.FEED_DB = { posts: [], nextId: 1, seeded: false };
  }
  return global.FEED_DB;
}

export function norm(s) {
  return String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function seedOnce(DB = ensureDB()) {
  if (DB.seeded) return;
  const now = Date.now();
  const sample = Array.from({ length: 12 }).map((_, i) => ({
    id: DB.nextId++,
    author: i % 2 ? "Ana" : "Luis",
    text:
      i % 3 === 0 ? "Bienvenidos al feed 😊 #bienvenida #elamigo"
    : i % 3 === 1 ? "¡Hola mundo! #hola"
                  : "Probando tendencias #elamigo #finanzas",
    createdAt: now - i * 60_000,
    reactions: { like: 0, dislike: 0, favorite: 0, not_interested: 0 },
    userReactions: {},
    comments: [],
    channelStates: {},
    images: [],
    audioUrl: null,
    liveMetrics: null,
    income: { tips: 0, total: 0 },
  }));

  // dedupe inicial (firma autor+texto)
  const seen = new Set();
  const unique = [];
  for (const p of sample) {
    const sig = `${p.author}:::${norm(p.text)}`;
    if (!seen.has(sig)) { seen.add(sig); unique.push(p); }
  }

  DB.posts = unique;
  DB.seeded = true;
}

export function dedupeByAuthorText(DB = ensureDB()) {
  const before = DB.posts.length;
  const bySig = new Map();
  for (const p of DB.posts) {
    const sig = `${p.author}:::${norm(p.text)}`;
    const cur = bySig.get(sig);
    if (!cur || (p.createdAt ?? 0) > (cur.createdAt ?? 0)) bySig.set(sig, p);
  }
  DB.posts = Array.from(bySig.values()).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return { removed: before - DB.posts.length, total: DB.posts.length };
}

export function findPost(DB, postId) {
  return DB.posts.find((p) => p.id === Number(postId));
}
