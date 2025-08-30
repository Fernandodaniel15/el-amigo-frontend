// Runner: procesa grupos pending cuyo runAt <= now
// GET /api/social/schedule/run  -> ejecuta un "tick" (y arranca interval interno si no arrancó)

function ensureDB() {
  if (!global.FEED_DB) global.FEED_DB = { posts: [], nextId: 1, seeded: false };
  return global.FEED_DB;
}
function ensureSched() {
  if (!global.SCHED_DB) {
    global.SCHED_DB = { groups: [], byId: new Map(), started: false, running: false };
  }
  return global.SCHED_DB;
}
function ensurePubKeys() {
  if (!global.PUBLISH_KEYS) global.PUBLISH_KEYS = new Set();
  return global.PUBLISH_KEYS;
}

async function publishBatch({ postId, targets, idempotencyKey }) {
  // Llama al publish real (telegram integrado; otros pending)
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/social/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId, targets, idempotencyKey })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`publish HTTP ${res.status}: ${t.slice(0,120)}`);
  }
  return res.json();
}

async function tick() {
  const S = ensureSched();
  const DB = ensureDB();
  const KEYS = ensurePubKeys();

  if (S.running) return; // lock simple
  S.running = true;
  try {
    const now = Date.now();
    const pendings = S.groups.filter(g => g.status === "pending" && Date.parse(g.runAt) <= now);

    for (const g of pendings) {
      const post = DB.posts.find(p => p.id === Number(g.postId));
      if (!post) { g.status = "failed"; g.receipts.push({ ch:"*", status:"error", detail:"post no existe", at: Date.now() }); continue; }

      const idem = `PUB:${g.groupId}:${g.postId}:${g.runAt}`;
      if (KEYS.has(idem)) { g.status = "done"; continue; } // ya corrido

      try {
        const r = await publishBatch({ postId: g.postId, targets: g.targets, idempotencyKey: idem });
        // armar recibos de lo que efectivamente quedó en channelStates
        const st = post.channelStates || {};
        const used = Object.entries(st).filter(([,v]) => v && v.status && v.status !== "disabled");
        for (const [ch, v] of used) {
          g.receipts.push({ ch, status: v.status, detail: v.detail, at: v.at || Date.now() });
        }
        g.status = "done";
        KEYS.add(idem);
      } catch (e) {
        g.attempts += 1;
        if (g.attempts >= 3) {
          g.status = "failed";
          g.receipts.push({ ch:"*", status:"error", detail:String(e.message || e), at: Date.now() });
        } else {
          // backoff: 2s, 10s, 60s aprox
          const delay = g.attempts === 1 ? 2000 : g.attempts === 2 ? 10000 : 60000;
          const next = new Date(Date.now() + delay).toISOString();
          g.runAt = next;
          g.receipts.push({ ch:"*", status:"retry", detail:`reintento #${g.attempts}`, at: Date.now() });
        }
      }
    }
  } finally {
    S.running = false;
  }
}

function ensureInterval() {
  const S = ensureSched();
  if (!S.started) {
    S.started = true;
    // pequeño interval para DEV: cada 5s hace tick
    S._int = setInterval(() => { tick().catch(()=>{}); }, 5000);
  }
}

export default async function handler(req, res) {
  ensureInterval();
  await tick(); // además de interval, ejecutamos un tick inmediato
  const S = ensureSched();
  res.status(200).json({ ok: true, running: true, pending: S.groups.filter(g=>g.status==="pending").length });
}
