// packages/web/lib/multichannel/worker.js
// Worker in-memory de demo: simula publicación por canal con timeouts.
// En producción lo reemplazamos por un worker real (BullMQ/Temporal) + adapters oficiales.

const CHANNEL_LATENCY_MS = {
  instagram: [1200, 2600],
  facebook: [900, 2200],
  x: [600, 1800],
  linkedin: [900, 2200],
  tiktok: [1500, 3200],
  telegram: [400, 1200],
  whatsapp: [400, 1200],
  mercadolibre: [1400, 2800],
};

function ensureDB() {
  if (!global.MULTI_DB) {
    global.MULTI_DB = {
      nextId: 1,
      posts: new Map(),
    };
  }
  return global.MULTI_DB;
}

function randBetween([a, b]) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function fakeRemoteId(ch) {
  return `${ch}_${Math.random().toString(36).slice(2, 10)}`;
}

// Simula la publicación por canal (éxito 85%, error 15%)
async function simulateChannelPublish(post, chObj) {
  const lat = CHANNEL_LATENCY_MS[chObj.channel] || [800, 1800];
  const wait = randBetween(lat);

  await new Promise((r) => setTimeout(r, wait));

  const ok = Math.random() < 0.85;
  if (ok) {
    chObj.status = "published";
    chObj.remotePostId = fakeRemoteId(chObj.channel);
    chObj.errorMessage = null;
  } else {
    chObj.status = "error";
    chObj.errorMessage = "Fallo simulado del canal";
  }
}

// Publica un post (si está scheduled, espera hasta la fecha)
function processPost(id) {
  const DB = ensureDB();
  const post = DB.posts.get(id);
  if (!post) return;

  // si ya está publicado/error no hacemos nada
  if (["published", "partial_error", "error"].includes(post.status)) return;

  // si está programado a futuro, re-enqueue al momento exacto
  if (post.scheduled_at) {
    const eta = new Date(post.scheduled_at).getTime();
    const now = Date.now();
    const delay = Math.max(0, eta - now);
    if (delay > 0) {
      post.status = "scheduled";
      setTimeout(() => processPost(id), delay);
      return;
    }
  }

  // empezar publicación
  post.status = "processing";
  post.channels.forEach((c) => {
    if (c.status === "scheduled" || c.status === "queued") c.status = "processing";
  });

  // correr todos los canales "en paralelo"
  Promise.all(
    post.channels.map(async (c) => {
      if (["published", "error"].includes(c.status)) return;
      await simulateChannelPublish(post, c);
    })
  ).then(() => {
    const errors = post.channels.filter((c) => c.status === "error").length;
    const published = post.channels.filter((c) => c.status === "published").length;

    if (published > 0 && errors === 0) {
      post.status = "published";
    } else if (published > 0 && errors > 0) {
      post.status = "partial_error";
    } else {
      post.status = "error";
    }
  });
}

export function enqueuePost(id) {
  const DB = ensureDB();
  const post = DB.posts.get(id);
  if (!post) return;
  // si no tiene programación, arrancamos ya
  if (!post.scheduled_at) {
    setTimeout(() => processPost(id), 0);
  } else {
    processPost(id); // él mismo se re-programa hasta su scheduled_at
  }
}
