// POST /api/social/publish/retry
// Body: { postId, channel }
// Reintenta un canal puntual y actualiza post.channelStates + auditoría

function ensureDB() {
  if (!global.FEED_DB) global.FEED_DB = { posts: [], nextId: 1, seeded: false };
  return global.FEED_DB;
}
function ensureAudit() {
  if (!global.PUB_AUDIT)
    global.PUB_AUDIT = { items: [], byPost: new Map(), nextId: 1 };
  return global.PUB_AUDIT;
}

const defPlacement = (ch) => (ch === "instagram" ? "feed" : ch === "whatsapp" ? "chat" : "default");

async function publishTelegram({ text }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { status: "disabled", detail: "TELEGRAM_* no configurado" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    if (!r.ok) return { status: "error", detail: `HTTP ${r.status}: ${(await r.text()).slice(0,140)}` };
    return { status: "done", detail: "enviado" };
  } catch(e) {
    return { status: "error", detail: String(e?.message || e) };
  }
}

function auditPush(AUD, { postId, channel, placement, payload, result }) {
  const item = {
    id: AUD.nextId++,
    postId, channel, placement, payload, result, at: Date.now()
  };
  AUD.items.push(item);
  if (!AUD.byPost.has(postId)) AUD.byPost.set(postId, []);
  AUD.byPost.get(postId).push(item);
  return item;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma","no-cache"); res.setHeader("Expires","0"); res.setHeader("Surrogate-Control","no-store");

  const DB = ensureDB();
  const AUD = ensureAudit();
  const { postId, channel } = req.body || {};
  if (!postId || !channel) return res.status(400).json({ error: "postId y channel requeridos" });

  const post = DB.posts.find(p => p.id === Number(postId));
  if (!post) return res.status(404).json({ error: "Post no encontrado" });

  const ch = String(channel);
  const placement = post.channelStates?.[ch]?.placement || defPlacement(ch);

  let result = { status: "pending", detail: "en cola" };
  try {
    if (ch === "telegram") {
      result = await publishTelegram({ text: post.text });
      if (result.status === "disabled") result = { status: "pending", detail: "telegram no configurado" };
    } else if (ch === "instagram") {
      const IG_REAL = process.env.IG_REAL === "1";
      result = IG_REAL
        ? { status: "done", detail: placement === "story" ? "story publicado (mock-real)" : "feed publicado (mock-real)" }
        : { status: "pending", detail: placement === "story" ? "story en cola" : "feed en cola" };
    } else if (ch === "whatsapp") {
      const WA_REAL = process.env.WA_REAL === "1";
      result = WA_REAL
        ? { status: "done", detail: placement === "status" ? "status publicado (mock-real)" : "mensajes enviados (mock-real)" }
        : { status: "pending", detail: placement === "status" ? "estado en cola" : "mensaje en cola" };
    } else {
      result = { status: "pending", detail: "integración en progreso" };
    }
  } catch (e) {
    result = { status: "error", detail: String(e?.message || e) };
  }

  auditPush(AUD, {
    postId: post.id, channel: ch, placement,
    payload: { text: post.text }, result
  });

  post.channelStates = post.channelStates || {};
  post.channelStates[ch] = { ...result, placement, at: Date.now() };

  return res.status(200).json({ ok: true, state: post.channelStates[ch], channelStates: post.channelStates });
}
