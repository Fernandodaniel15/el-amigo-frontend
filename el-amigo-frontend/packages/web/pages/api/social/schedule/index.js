// API de programación agrupada (en memoria)
// POST /api/social/schedule       -> crea grupo (uno o varios runAt)
// GET  /api/social/schedule       -> lista grupos (?status=pending|done|failed)
// POST /api/social/schedule/cancel -> cancelar grupo futuro { groupId }

function ensureDB() {
  if (!global.FEED_DB) global.FEED_DB = { posts: [], nextId: 1, seeded: false };
  return global.FEED_DB;
}

function ensureSched() {
  if (!global.SCHED_DB) {
    global.SCHED_DB = {
      groups: [],           // [{groupId, postId, targets, runAt, status, receipts:[], attempts:number}]
      byId: new Map(),
      started: false
    };
  }
  return global.SCHED_DB;
}

function isISODate(s) { return typeof s === "string" && !Number.isNaN(Date.parse(s)); }

export default async function handler(req, res) {
  // no-cache
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma","no-cache"); res.setHeader("Expires","0"); res.setHeader("Surrogate-Control","no-store");

  const DB = ensureDB();
  const S = ensureSched();

  if (req.method === "GET") {
    const { status } = req.query || {};
    const list = S.groups.filter(g => !status || g.status === status);
    return res.status(200).json({ ok: true, groups: list });
  }

  if (req.method === "POST") {
    const { groupId, post, postId, targets = {}, runAt, dryRun = false } = req.body || {};
    // validaciones básicas
    if (!post && !postId) return res.status(400).json({ error: "Falta post o postId" });
    if (!runAt) return res.status(400).json({ error: "runAt requerido (ISO)" });
    const times = Array.isArray(runAt) ? runAt : [runAt];
    if (times.some(t => !isISODate(t))) return res.status(400).json({ error: "runAt inválido" });

    // crear post si no vino postId
    let pid = Number(postId) || null;
    if (!pid) {
      const now = Date.now();
      const obj = {
        id: DB.nextId++,
        author: "scheduler",
        text: String(post?.text || "").slice(0, 280),
        createdAt: now,
        reactions: { like: 0, dislike: 0, favorite: 0, not_interested: 0 },
        userReactions: {},
        comments: [],
        channelStates: {}
      };
      DB.posts.unshift(obj);
      pid = obj.id;
    }

    // generar grupos (uno por runAt para simplificar auditoría)
    const baseId = groupId || `grp_${pid}_${Date.now()}`;
    const created = [];
    for (let i = 0; i < times.length; i++) {
      const gid = times.length === 1 ? baseId : `${baseId}_${i+1}`;
      if (S.byId.has(gid)) return res.status(409).json({ error: `groupId duplicado: ${gid}` });

      const g = {
        groupId: gid,
        postId: pid,
        targets,                  // {channel:{enabled,placement}}
        runAt: new Date(times[i]).toISOString(),
        status: dryRun ? "dry-run" : "pending",
        attempts: 0,
        receipts: []              // [{ch,status,detail,at}]
      };
      S.groups.push(g); S.byId.set(gid, g);
      created.push(g);
    }

    return res.status(200).json({ ok: true, groups: created });
  }

  // cancelar
  if (req.method === "PUT" || (req.method === "POST" && req.url.endsWith("/cancel"))) {
    const { groupId } = req.body || {};
    const S = ensureSched();
    const g = S.byId.get(groupId);
    if (!g) return res.status(404).json({ error: "groupId no encontrado" });
    if (g.status !== "pending") return res.status(400).json({ error: "Solo pending puede cancelarse" });
    g.status = "canceled";
    return res.status(200).json({ ok: true, group: g });
  }

  res.setHeader("Allow", ["GET","POST","PUT"]);
  return res.status(405).end("Method Not Allowed");
}
