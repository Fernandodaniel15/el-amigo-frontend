// POST /api/social/publish
// Body (compat):
//  - { postId, targets: { [ch]: { enabled, placement? } } }    // viejo
//  - { postId, channels: { [ch]: boolean }, targets: {...} }   // nuevo
//  - opcional: idempotencyKey (evita duplicados exactos por canal)
// Canales: telegram, facebook, x, instagram, linkedin, tiktok, whatsapp
//
// Mantiene: idempotencia, auditoría (PUB_AUDIT), conectores mock-real IG/WA.
// Extra: si Telegram está “disabled” por env faltante, no persistimos como disabled:
//        lo tratamos como "pending" con detail claro, para no ensuciar la UI.

function ensureDB() {
  if (!global.FEED_DB) global.FEED_DB = { posts: [], nextId: 1, seeded: false };
  return global.FEED_DB;
}
function ensureAudit() {
  if (!global.PUB_AUDIT)
    global.PUB_AUDIT = { items: [], byPost: new Map(), nextId: 1 };
  return global.PUB_AUDIT;
}
function ensurePubKeys() {
  if (!global.PUBLISH_KEYS) global.PUBLISH_KEYS = new Set(); // idempotencia
  return global.PUBLISH_KEYS;
}

const ALL = ["telegram","facebook","x","instagram","linkedin","tiktok","whatsapp"];
const defPlacement = (ch) => (ch === "instagram" ? "feed" : ch === "whatsapp" ? "chat" : "default");

function normalize({ channels = {}, targets = {}, legacyTargets = null }) {
  const base = legacyTargets && typeof legacyTargets === "object" ? legacyTargets : null;
  const out = {};
  for (const ch of ALL) {
    if (base && base[ch]) {
      out[ch] = { enabled: !!base[ch].enabled, placement: base[ch].placement || defPlacement(ch) };
    } else {
      out[ch] = { enabled: !!channels[ch], placement: targets[ch] || defPlacement(ch) };
    }
  }
  return out;
}

// ====== Integración real: Telegram ======
async function publishTelegram({ text }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { status: "disabled", detail: "TELEGRAM_* no configurado" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    if (!res.ok) return { status: "error", detail: `HTTP ${res.status}: ${(await res.text()).slice(0,140)}` };
    return { status: "done", detail: "enviado" };
  } catch (e) {
    return { status: "error", detail: String(e?.message || e) };
  }
}

// ====== Conectores “mock reales”: Instagram & WhatsApp ======
async function publishInstagram({ placement, post }) {
  const AUD = ensureAudit();
  const payload = {
    type: placement === "story" ? "IG_STORY" : "IG_FEED",
    text: post.text,
  };

  const IG_REAL = process.env.IG_REAL === "1"; // flag simple
  let result;
  if (IG_REAL) {
    // (placeholder integración real)
    result = { status: "done", detail: placement === "story" ? "story publicado (mock-real)" : "feed publicado (mock-real)" };
  } else {
    result = { status: "pending", detail: placement === "story" ? "story en cola" : "feed en cola" };
  }

  auditPush(AUD, { postId: post.id, channel: "instagram", placement, payload, result });
  return result;
}

async function publishWhatsApp({ placement, post }) {
  const AUD = ensureAudit();
  const payload = {
    type: placement === "status" ? "WA_STATUS" : "WA_CHAT_BROADCAST",
    text: post.text,
  };

  const WA_REAL = process.env.WA_REAL === "1"; // flag simple
  let result;
  if (WA_REAL) {
    // (placeholder integración real)
    result = { status: "done", detail: placement === "status" ? "status publicado (mock-real)" : "mensajes enviados (mock-real)" };
  } else {
    result = { status: "pending", detail: placement === "status" ? "estado en cola" : "mensaje en cola" };
  }

  auditPush(AUD, { postId: post.id, channel: "whatsapp", placement, payload, result });
  return result;
}

// ====== Utilidad de auditoría ======
function auditPush(AUD, { postId, channel, placement, payload, result }) {
  const item = {
    id: AUD.nextId++,
    postId,
    channel,
    placement,
    payload,
    result,
    at: Date.now()
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

  // no-cache
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma","no-cache"); res.setHeader("Expires","0"); res.setHeader("Surrogate-Control","no-store");

  const DB = ensureDB();
  const AUD = ensureAudit();
  const KEYS = ensurePubKeys();

  const { postId, idempotencyKey } = req.body || {};
  if (!postId) return res.status(400).json({ error: "postId requerido" });

  // idempotencia por lote
  if (idempotencyKey && KEYS.has(idempotencyKey)) {
    const post0 = DB.posts.find((p) => p.id === Number(postId));
    return res.status(200).json({ ok: true, channelStates: post0?.channelStates || {} , idempotent: true });
  }

  const post = DB.posts.find((p) => p.id === Number(postId));
  if (!post) return res.status(404).json({ error: "Post no encontrado" });

  const normalized = normalize({
    channels: req.body.channels || {},
    targets:  req.body.targets  || {},
    legacyTargets: req.body.targets && req.body.targets.telegram?.enabled !== undefined ? req.body.targets : null
  });

  post.channelStates = post.channelStates || {};

  // Solo procesamos y persistimos canales habilitados
  for (const [ch, cfg] of Object.entries(normalized)) {
    if (!cfg.enabled) continue;

    const placement = cfg.placement || defPlacement(ch);
    let result = { status: "pending", detail: "en cola" };

    try {
      if (ch === "telegram") {
        result = await publishTelegram({ text: post.text });
        // No persistimos "disabled": lo transformamos a pending con detalle claro (no ensucia la UI)
        if (result.status === "disabled") {
          result = { status: "pending", detail: "telegram no configurado" };
        }
      } else if (ch === "instagram") {
        result = await publishInstagram({ placement, post });
      } else if (ch === "whatsapp") {
        result = await publishWhatsApp({ placement, post });
      } else if (["facebook","x","linkedin","tiktok"].includes(ch)) {
        auditPush(ensureAudit(), {
          postId: post.id, channel: ch, placement,
          payload: { type: `${ch.toUpperCase()}_${String(placement || "default").toUpperCase()}`, text: post.text },
          result: { status: "pending", detail: "integración en progreso" }
        });
        result = { status: "pending", detail: "integración en progreso" };
      }
    } catch (e) {
      result = { status: "error", detail: String(e?.message || e) };
      auditPush(AUD, {
        postId: post.id, channel: ch, placement,
        payload: { text: post.text }, result
      });
    }

    post.channelStates[ch] = { ...result, placement, at: Date.now() };
  }

  if (idempotencyKey) KEYS.add(idempotencyKey);

  return res.status(200).json({ ok: true, channelStates: post.channelStates });
}
