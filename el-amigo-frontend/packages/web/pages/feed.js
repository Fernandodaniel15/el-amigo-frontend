/* /pages/feed.js */
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

/* =================== Utils & infra =================== */

const axiosClient = axios.create({
  headers: {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
  },
});

const noCacheParams = () => ({ _t: Date.now() });
const POST_DUP_WINDOW_MS = 10 * 1000;

function postSig(p = {}) {
  const author = (p.author || "").trim().toLowerCase();
  const text = String(p.text || "").trim();
  const t = Number(p.createdAt || 0);
  const bucket = Math.floor(t / POST_DUP_WINDOW_MS);
  const imgs = (p.images || []).join("|");
  const vids = (p.videos || []).join("|");
  const audSig = [p.audioUrl || "", ...((p.audios || []).filter(Boolean))].join("|");
  return `${author}:::${text}:::${bucket}:::${imgs}:::${vids}:::${audSig}`;
}
function dedupePosts(list) {
  const seenIds = new Set(), seenSig = new Set(), out = [];
  for (const p of list || []) {
    if (!p) continue;
    const id = p.id, sig = postSig(p);
    if (id != null && seenIds.has(id)) continue;
    if (seenSig.has(sig)) continue;
    if (id != null) seenIds.add(id);
    seenSig.add(sig);
    out.push(p);
  }
  return out;
}

function commentSig(c) {
  const a = (c.author || "").trim().toLowerCase();
  return `${a}:::${String(c.text || "").trim()}:::${c.whisper ? 1 : 0}:::${c.audioUrl || ""}`;
}
function dedupeComments(arr = []) {
  const seen = new Set(), out = [];
  for (const c of arr) { const sig = commentSig(c); if (!seen.has(sig)) { seen.add(sig); out.push(c); } }
  return out;
}

function extractTags(text = "") {
  return (text.match(/#([a-zA-Z0-9_ñáéíóúÁÉÍÓÚ_]+)/g) || []).map((t) => t.slice(1).toLowerCase());
}
function blurStyle(hidden) {
  return hidden ? { filter: "blur(6px)", color: "#888", userSelect: "none", pointerEvents: "none", textShadow: "0 0 16px #bbb", opacity: 0.6 } : {};
}

async function urlToDataURL(url) {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
async function blobToDataURL(blob) {
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
async function uploadFromUrl(url, { name = "rec.webm", type = "audio/webm", effect = "none" } = {}) {
  const dataUrl = await urlToDataURL(url);
  const r = await axiosClient.post("/api/upload", { name, type, data: dataUrl, effect });
  return r.data?.url || null;
}
async function uploadBlobMultipart(name, type, blob, extra = {}) {
  const fd = new FormData();
  fd.append("file", blob, name);
  Object.entries(extra || {}).forEach(([k, v]) => fd.append(k, String(v)));
  const r = await axiosClient.post("/api/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
    maxBodyLength: Infinity,
  });
  return r.data?.url || null;
}
// WebAudio: aplicar efecto a un blob de audio
async function applyVoiceEffectToBlob(effect, blobIn) {
  if (!effect || effect === "none") return blobIn;

  const arrayBuf = await blobIn.arrayBuffer();
  const tempAc = new (window.AudioContext || window.webkitAudioContext)();
  const srcBuffer = await tempAc.decodeAudioData(arrayBuf.slice(0));
  await tempAc.close();

  const offline = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
    srcBuffer.numberOfChannels,
    srcBuffer.length,
    srcBuffer.sampleRate
  );
  const s = offline.createBufferSource();
  s.buffer = srcBuffer;
  let node = s;

  switch (effect) {
    case "robot": {
      const osc = offline.createOscillator();
      const gain = offline.createGain();
      osc.frequency.value = 60;
      osc.start();
      const mod = offline.createGain();
      mod.gain.value = 0.5;
      osc.connect(mod);
      mod.connect(gain.gain);
      node.connect(gain);
      node = gain;
      break;
    }
    case "deep": {
      const biq = offline.createBiquadFilter();
      biq.type = "lowshelf";
      biq.frequency.value = 200;
      biq.gain.value = 8;
      node.connect(biq);
      node = biq;
      break;
    }
    case "chipmunk": {
      s.playbackRate.value = 1.25;
      break;
    }
    case "hall": {
      const delay = offline.createDelay();
      delay.delayTime.value = 0.18;
      const fb = offline.createGain();
      fb.gain.value = 0.35;
      node.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      node = delay;
      break;
    }
  }

  node.connect(offline.destination);
  s.start();

  const rendered = await offline.startRendering();

  function bufferToWav(abuf) {
    const numOfChan = abuf.numberOfChannels;
    const length = abuf.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);

    function writeString(view, offset, string) {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    }

    let pos = 0;
    writeString(view, pos, "RIFF"); pos += 4;
    view.setUint32(pos, length - 8, true); pos += 4;
    writeString(view, pos, "WAVE"); pos += 4;
    writeString(view, pos, "fmt "); pos += 4;
    view.setUint32(pos, 16, true); pos += 4;
    view.setUint16(pos, 1, true); pos += 2; // PCM
    view.setUint16(pos, numOfChan, true); pos += 2;
    view.setUint32(pos, abuf.sampleRate, true); pos += 4;
    view.setUint32(pos, abuf.sampleRate * numOfChan * 2, true); pos += 4;
    view.setUint16(pos, numOfChan * 2, true); pos += 2;
    view.setUint16(pos, 16, true); pos += 2;
    writeString(view, pos, "data"); pos += 4;
    view.setUint32(pos, length - pos - 4, true); pos += 4;

    const channels = [];
    for (let i = 0; i < numOfChan; i++) channels.push(abuf.getChannelData(i));
    let offset = 0;
    while (offset < abuf.length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        pos += 2;
      }
      offset++;
    }
    return new Blob([view], { type: "audio/wav" });
  }

  return bufferToWav(rendered);
}

/* =================== UI helpers =================== */

function EmojiBar({ onPick }) {
  const emojis = ["😊", "😂", "❤", "⭐", "🔥", "👍", "👎", "🚫"];
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
      {emojis.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onPick(e)}
          style={{ border: "1px solid #ddd", borderRadius: 6, padding: "2px 6px", background: "#fff", cursor: "pointer" }}
          title={`Insertar ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
// Calecita de imágenes con autoplay + efectos "slide|fade"
function MediaCarousel({ items = [], autoPlay = false, intervalMs = 3000, effect = "slide" }) {
  const [i, setI] = useState(0);
  const wrap = (n) => (n + items.length) % items.length;
  const startX = useRef(0);
  const delta = useRef(0);
  const dragging = useRef(false);
  const [paused, setPaused] = useState(false);

  function prev() { setI(v => wrap(v - 1)); }
  function next() { setI(v => wrap(v + 1)); }

  function onTouchStart(e) { startX.current = e.touches[0].clientX; delta.current = 0; }
  function onTouchMove(e) { delta.current = e.touches[0].clientX - startX.current; }
  function onTouchEnd() { if (delta.current > 50) prev(); else if (delta.current < -50) next(); delta.current = 0; }
  function onMouseDown(e) { dragging.current = true; startX.current = e.clientX; delta.current = 0; }
  function onMouseMove(e) { if (!dragging.current) return; delta.current = e.clientX - startX.current; }
  function onMouseUp() { if (!dragging.current) return; dragging.current = false; if (delta.current > 50) prev(); else if (delta.current < -50) next(); delta.current = 0; }

  if (!items.length) return null;
  const containerRef = useRef(null);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  useEffect(() => {
    if (items[i]) {
      const img = new Image();
      img.onload = () => {
        if (containerRef.current) {
          const newAspectRatio = img.width / img.height;
          setAspectRatio(newAspectRatio || 16 / 9);
        }
      };
      img.src = items[i];
    }
  }, [i, items]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "ArrowLeft") prev(); if (e.key === "ArrowRight") next(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!autoPlay || items.length < 2 || paused) return;
    const id = setInterval(() => setI(v => wrap(v + 1)), Math.max(800, intervalMs | 0));
    return () => clearInterval(id);
  }, [autoPlay, intervalMs, paused, items.length]);

  return (
    <div style={{ position: "relative", width: "100%", marginTop: 8 }}>
      <div
        ref={containerRef}
        style={{ position: "relative", width: "100%", paddingTop: `${(1 / aspectRatio) * 100}%`, overflow: "hidden", borderRadius: 12, touchAction: "pan-y" }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => { onMouseUp(); setPaused(false); }}
      >
        {items.length > 1 && <>
          <button onClick={prev} aria-label="Anterior" style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", zIndex: 20, background: "rgba(0,0,0,.45)", color: "#fff", border: "none", borderRadius: 20, width: 32, height: 32, cursor: "pointer" }}>‹</button>
          <button onClick={next} aria-label="Siguiente" style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", zIndex: 20, background: "rgba(0,0,0,.45)", color: "#fff", border: "none", borderRadius: 20, width: 32, height: 32, cursor: "pointer" }}>›</button>
          <button onClick={() => setPaused(p => !p)} aria-label={paused ? "Reanudar" : "Pausar"}
            style={{ position:"absolute", left:"50%", bottom:6, transform:"translateX(-50%)", zIndex:20, background:"rgba(0,0,0,.45)", color:"#fff", border:"none", borderRadius:20, padding:"4px 10px", cursor:"pointer" }}>
            {paused ? "▶︎" : "⏸︎"}
          </button>
        </>}
        {items.map((src, idx) => {
          const offset = idx - i;
          const isActive = offset === 0;

          const transform = effect === "slide"
            ? (isActive ? "translateX(0) scale(1)" : `translateX(${offset * 16}px) scale(${1 - Math.min(Math.abs(offset) * 0.06, 0.24)})`)
            : "translateX(0) scale(1)";

          const opacity = effect === "fade"
            ? (isActive ? 1 : 0)
            : (isActive ? 1 : 0.85 - Math.min(Math.abs(offset) * 0.1, 0.4));

          const z = 10 - Math.abs(offset);

          return (
            <img
              key={idx}
              src={src}
              alt={`media-${idx}`}
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
                borderRadius: 12, boxShadow: "0 8px 28px rgba(0,0,0,.18)",
                transform, transition: "transform .25s ease, opacity .25s ease", zIndex: z, opacity
              }}
            />
          );
        })}
      </div>
      {items.length > 1 && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
          {items.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)} style={{ width: 8, height: 8, borderRadius: "50%", border: "none", background: idx === i ? "#6b25d7" : "#ccc", cursor: "pointer" }} aria-label={`Ir a ${idx + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/* =================== Toast =================== */

function useToast() {
  const [toasts, setToasts] = useState([]);
  function show(message, type = "info", ms = 2400) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), ms);
  }
  function ToastContainer() {
    return (
      <div style={{ position: "fixed", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 8, zIndex: 9999 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ padding: "10px 12px", borderRadius: 10, background: t.type === "error" ? "#ffe0e0" : t.type === "success" ? "#e9ffe9" : "#f2f2ff", border: "1px solid #ddd", boxShadow: "0 6px 18px rgba(0,0,0,.08)", fontSize: 14 }}>{t.message}</div>
        ))}
      </div>
    );
  }
  return { show, ToastContainer };
}
/* =================== Métricas (batch) =================== */
function useMetricsBatch(postIds) {
  const [map, setMap] = useState({});
  const idsKey = (postIds || []).sort((a, b) => a - b).join(",");
  useEffect(() => {
    let stop = false;
    async function tick() {
      if (!postIds || postIds.length === 0) return;
      try {
        const r = await axiosClient.get("/api/social/metrics-batch", { params: { ids: postIds.join(","), _t: Date.now() } });
        const byId = r.data?.metricsById || {};
        if (!stop) setMap((prev) => ({ ...prev, ...byId }));
      } catch { }
    }
    tick();
    const id = setInterval(tick, 2500);
    return () => { stop = true; clearInterval(id); };
  }, [idsKey, postIds]);
  return map;
}
function MetricsBar({ data }) {
  if (!data) return null;
  const s = data.sentiment || { joy: 0, anger: 0, neutral: 0 };
  return (
    <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#444" }}>
      <span>👀 en vivo: <b>{data.viewersNow ?? 0}</b></span>
      <span>Vistas: <b>{data.views ?? 0}</b></span>
      <span>Hook: <b>{data.hook ?? 0}%</b></span>
      <span>Retención: <b>{data.retention ?? 0}%</b></span>
      <span>Calidad click: <b>{data.clickQuality ?? 0}%</b></span>
      <span>CPM: $<b>{data.cpm ?? 0}</b></span>
      <span>Sentimiento: 😊 {s.joy ?? 0}% | 😠 {s.anger ?? 0}% | 😐 {s.neutral ?? 0}%</span>
    </div>
  );
}
function ChannelChip({ state }) {
  const st = state || {};
  const bg = st.status === "done" ? "#e8ffe8" : st.status === "error" ? "#ffe8e8" : "#f6f6f6";
  const label = st.status === "done" ? "✓" : st.status === "error" ? "✕" : st.status === "disabled" ? "—" : "⏳";
  return <span title={st.detail || st.status} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "2px 6px", fontSize: 12, background: bg }}>{label}</span>;
}

/* =================== Helpers multimedia =================== */
function isImage(u = "") { return /\.(png|jpe?g|gif|webp)$/i.test(u) || u.startsWith("data:image"); }
function isAudio(u = "") { return /\.(mp3|m4a|wav|ogg|webm)$/i.test(u) || u.startsWith("data:audio"); }
function isVideo(u = "") { return /\.(mp4|webm|mov|mkv)$/i.test(u) || u.startsWith("data:video"); }
function extractUrls(t = "") { return Array.from(new Set(t.match(/https?:\/\/\S+|data:[^ )\n]+/g) || [])); }

// NUEVO: limpiar URLs de media del texto mostrado
function stripMediaUrlsFromText(text = "") {
  if (!text) return "";
  const urls = extractUrls(text);
  let out = text;
  for (const u of urls) {
    if (isImage(u) || isAudio(u) || isVideo(u)) {
      out = out.split(u).join(" ");
    }
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function renderMediaFromText(text = "") {
  const urls = Array.from(new Set(text.match(/https?:\/\/\S+|data:[^ )\n]+/g) || []));
  if (urls.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
      {urls.map((u, i) => (
        <div key={i} style={{ border: '1px solid #eee', borderRadius: 8, padding: 6 }}>
          {isImage(u) && <img src={u} alt="" style={{ maxWidth: 240, maxHeight: 180, borderRadius: 6 }} />}
          {isAudio(u) && <audio controls src={u} style={{ maxWidth: 260 }} />}
          {isVideo(u) && <video controls src={u} style={{ maxWidth: 260, maxHeight: 180, borderRadius: 6 }} />}
          {!isImage(u) && !isAudio(u) && !isVideo(u) && (
            <a href={u} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>{u}</a>
          )}
        </div>
      ))}
    </div>
  );
}

/* =================== VideoStack =================== */
function VideoStack({ items = [], autoChain = true }) {
  const [i, setI] = useState(0);
  const vRefs = useRef([]);

  const wrap = (n) => ((n % items.length) + items.length) % items.length;
  const goTo = (n) => {
    const next = wrap(n);
    vRefs.current.forEach((v, idx) => {
      if (!v) return;
      if (idx !== next) { try { v.pause(); v.currentTime = v.currentTime; } catch {} }
    });
    setI(next);
  };
  const prev = () => goTo(i - 1);
  const next = () => goTo(i + 1);

  useEffect(() => {
    if (!autoChain || items.length < 2) return;
    const cur = vRefs.current[i];
    if (!cur) return;
    const onEnd = () => goTo(i + 1);
    cur.addEventListener("ended", onEnd);
    return () => cur.removeEventListener("ended", onEnd);
  }, [i, items.length, autoChain]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "ArrowLeft") prev(); if (e.key === "ArrowRight") next(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i]); // eslint-disable-line

  if (!items.length) return null;

  return (
    <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden" }}>
      {items.map((src, idx) => {
        const active = idx === i;
        return (
          <video
            key={idx}
            ref={(el) => (vRefs.current[idx] = el)}
            src={src}
            controls={active}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              transition: "opacity .25s ease",
              opacity: active ? 1 : 0,
              pointerEvents: active ? "auto" : "none",
            }}
            autoPlay={false}
            playsInline
          />
        );
      })}
      {items.length > 1 && (
        <>
          <button onClick={prev} aria-label="Anterior"
            style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", zIndex: 20,
                     background: "rgba(0,0,0,.45)", color: "#fff", border: "none", borderRadius: 20,
                     width: 32, height: 32, cursor: "pointer" }}>‹</button>
          <button onClick={next} aria-label="Siguiente"
            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", zIndex: 20,
                     background: "rgba(0,0,0,.45)", color: "#fff", border: "none", borderRadius: 20,
                     width: 32, height: 32, cursor: "pointer" }}>›</button>
          <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
            {items.map((_, idx) => (
              <button key={idx} onClick={() => goTo(idx)} aria-label={`Ir a ${idx + 1}`}
                style={{ width: 8, height: 8, borderRadius: "50%", border: "none",
                         background: idx === i ? "#6b25d7" : "#ccc", cursor: "pointer" }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
/* =================== Comentarios =================== */
function CommentSection({ postId, postOwner, comments = [], onAddCommentOptimistic, onReactCommentOptimistic, currentUser, showToast }) {
  const [comment, setComment] = useState(""); const [sending, setSending] = useState(false);
  const cleanComments = dedupeComments(comments);

  const [recC, setRecC] = useState({ recording: false, seconds: 0 });
  const recCRef = useRef(null); const recCTimerRef = useRef(null);
  const [whisperNext, setWhisperNext] = useState(false);

  function pickAudioMimeLocal() {
    const cands = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
    for (const t of cands) { if (window.MediaRecorder?.isTypeSupported?.(t)) return t; }
    return "";
  }

  async function startCommentRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickAudioMimeLocal();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        clearInterval(recCTimerRef.current);
        setRecC({ recording: false, seconds: 0 });
        try {
          const blobType = mr.mimeType || mimeType || "audio/webm";
          let blob = new Blob(chunks, { type: blobType });

          const audioUrl = await uploadBlobMultipart(
            blob.type.endsWith("wav") ? "comment.wav" : "comment.webm",
            blob.type,
            blob,
            { name: "comment", effect: "none" }
          );
          if (!audioUrl) throw new Error("upload-sin-url");

          let txt = "";
          try {
            const dataUrl = await blobToDataURL(blob);
            const tr = await axiosClient.post("/api/transcribe", { audioData: dataUrl, type: blobType });
            txt = tr.data?.text || tr.data?.message || "";
          } catch { /* si falla la transcripción, igual posteamos el audio */ }

          onAddCommentOptimistic(postId, txt, whisperNext, audioUrl);
          showToast("Nota de voz enviada ✔", "success");
        } catch {
          showToast("No se pudo enviar la nota de voz", "error");
        } finally { try { stream.getTracks().forEach(t => t.stop()); } catch {} }
      };
      recCRef.current = mr;
      mr.start();
      setRecC({ recording: true, seconds: 0 });
      recCTimerRef.current = setInterval(() => setRecC(r => ({ ...r, seconds: r.seconds + 1 })), 1000);
    } catch { showToast("No se pudo acceder al micrófono", "error"); }
  }
  function stopCommentRecording() { try { recCRef.current?.stop(); } catch { } }

  return (
    <div style={{ marginLeft: 28, marginTop: 8 }}>
      <ul style={{ listStyle: "disc inside" }}>
        {cleanComments.map((c, i) => {
          const myType = c.userReactions?.[currentUser] || null;
          const likeCnt = c.reactions?.like ?? 0, dislikeCnt = c.reactions?.dislike ?? 0, favCnt = c.reactions?.favorite ?? 0, notIntCnt = c.reactions?.not_interested ?? 0;
          const shouldBlur = !!c.whisper && !(c.author === currentUser || postOwner === currentUser);
          const Btn = ({ type, label, title, count }) => (
            <button
              onClick={() => onReactCommentOptimistic(postId, i, type)}
              title={title}
              style={{ background: myType === type ? "#ffd" : "", marginRight: 4, transition: "transform 140ms ease" }}
            >
              {label} <span style={{ fontSize: 12 }}>{count}</span>
            </button>
          );
          return (
            <li key={`${i}:${commentSig(c)}`} style={{ fontSize: 15, marginBottom: 6 }}>
              <b>{shouldBlur ? "Anónimo" : c.author}</b>:{" "}
              <span style={shouldBlur ? blurStyle(true) : { whiteSpace: "pre-wrap" }}>
                {c.text}{c.whisper && <em style={{ marginLeft: 6, color: "#b29" }}>(al oído)</em>}
              </span>
              {c.audioUrl && (
                <div style={{ marginTop: 6 }}>
                  <audio controls src={c.audioUrl} style={{ width: 380, maxWidth: "100%" }} />
                </div>
              )}
              <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                <Btn type="like" label="❤" title="Like" count={likeCnt} />
                <Btn type="dislike" label="👎" title="No me gusta" count={dislikeCnt} />
                <Btn type="favorite" label="⭐" title="Favorito" count={favCnt} />
                <Btn type="not_interested" label="🚫" title="No me interesa" count={notIntCnt} />
              </div>
            </li>
          );
        })}
      </ul>

      <form
        onSubmit={(e) => { e.preventDefault(); if (!sending && comment.trim()) { setSending(true); onAddCommentOptimistic(postId, comment.trim(), whisperNext, null); setComment(""); setTimeout(() => setSending(false), 350); } }}
        style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}
      >
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Agregar comentario…" style={{ flex: 1, minWidth: 220, padding: 7, borderRadius: 8, border: "1px solid #ccc", fontSize: 15 }} />
        <label style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={whisperNext} onChange={e => setWhisperNext(e.target.checked)} /> 👂 Al oído
        </label>
        <button type="submit" disabled={sending || !comment.trim()} style={{ padding: "7px 15px", borderRadius: 8, opacity: sending ? 0.6 : 1 }}>Comentar</button>
        {!recC.recording ? (
          <button type="button" onClick={startCommentRecording} style={{ padding: "7px 12px", borderRadius: 8, background: "#fff", border: "1px solid #bbb" }} title="Grabar comentario por voz">
            🎙 Voz
          </button>
        ) : (
          <button type="button" onClick={stopCommentRecording} style={{ padding: "7px 12px", borderRadius: 8, background: "#fff", border: "1px solid #f55", color: "#f55" }} title="Detener grabación">
            ⏹ Detener ({recC.seconds}s)
          </button>
        )}
      </form>
      <EmojiBar onPick={(e) => setComment((t) => (t || "") + e)} />
    </div>
  );
}

/* == Subtítulos multi-idioma para audios == */
function SubtitlesComposer({ audios = [], onToast }) {
  const SUB_LANGS = [
    { code: "es", label: "Español" },
    { code: "en", label: "English" },
    { code: "pt", label: "Português" },
  ];
  const [langs, setLangs] = useState({ es: true, en: true, pt: false });
  const [placing, setPlacing] = useState("bottom");
  const [font, setFont] = useState("Inter, system-ui, sans-serif");
  const [subsByUrl, setSubsByUrl] = useState({});
  const [busy, setBusy] = useState(false);

  async function transcribeInLanguage(urlOrBlob, lang) {
    try {
      const dataUrl = typeof urlOrBlob === "string" ? await urlToDataURL(urlOrBlob) : await blobToDataURL(urlOrBlob);
      const r = await axiosClient.post("/api/transcribe", { audioData: dataUrl, type: "audio/*", language: lang });
      return r.data?.text || "";
    } catch { return ""; }
  }

  async function run() {
    try {
      setBusy(true);
      const selected = Object.entries(langs).filter(([, v]) => v).map(([k]) => k);
      if (!selected.length) return onToast("Elegí al menos 1 idioma", "error");
      const next = { ...subsByUrl };
      for (const u of audios) {
        next[u] = next[u] || {};
        for (const L of selected) {
          const txt = await transcribeInLanguage(u, L);
          next[u][L] = txt || "(sin texto)";
        }
      }
      setSubsByUrl(next);
      onToast("Subtítulos listos ✔", "success");
    } finally { setBusy(false); }
  }

  return (
    <div style={{ marginTop: 8, padding: 8, border: "1px dashed #bbb", borderRadius: 8 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#555" }}>Subtítulos:</span>
        {SUB_LANGS.map(L => (
          <label key={L.code} style={{ fontSize: 13 }}>
            <input type="checkbox" checked={!!langs[L.code]} onChange={e => setLangs(s => ({ ...s, [L.code]: e.target.checked }))} /> {L.label}
          </label>
        ))}
        <select value={placing} onChange={e => setPlacing(e.target.value)} style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #bbb" }}>
          <option value="bottom">Abajo</option>
          <option value="top">Arriba</option>
        </select>
        <select value={font} onChange={e => setFont(e.target.value)} style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #bbb" }}>
          <option value="Inter, system-ui, sans-serif">Inter</option>
          <option value="Poppins, system-ui, sans-serif">Poppins</option>
          <option value="Montserrat, system-ui, sans-serif">Montserrat</option>
          <option value="Oswald, system-ui, sans-serif">Oswald</option>
        </select>
        <button type="button" onClick={run} disabled={busy} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #bbb", background: "#fff" }}>
          {busy ? "Transcribiendo…" : "Generar subtítulos"}
        </button>
      </div>

      {Object.keys(subsByUrl).length > 0 && (
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {audios.map((u, i) => (
            <div key={i} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
              <audio controls src={u} style={{ width: "100%" }} />
              <div style={{ position: "relative", marginTop: 6, minHeight: 28 }}>
                {Object.entries(subsByUrl[u] || {}).map(([L, txt]) => (
                  <div
                    key={L}
                    style={{
                      fontFamily: font, fontSize: 14, lineHeight: 1.35,
                      position: "relative", textAlign: "center",
                      padding: placing === "bottom" ? "18px 6px 0" : "0 6px 18px"
                    }}
                  >
                    <b style={{ fontSize: 12, color: "#6b25d7" }}>[{L}]</b> {txt}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
/* === Subtítulos para video (transcribe pista de audio del video) === */
function VideoSubtitlesComposer({ videos = [], onToast }) {
  const [placing, setPlacing] = useState("bottom");
  const [font, setFont] = useState("Inter, system-ui, sans-serif");
  const [busy, setBusy] = useState(false);
  const [subsByUrl, setSubsByUrl] = useState({}); // { url: "texto" }

  async function transcribeVideo(url) {
    try {
      const dataUrl = await urlToDataURL(url);
      const r = await axiosClient.post("/api/transcribe", { audioData: dataUrl, type: "video/*" });
      return r.data?.text || r.data?.message || "";
    } catch { return ""; }
  }

  async function run() {
    if (!videos.length) return onToast("No hay videos para subtitular", "error");
    setBusy(true);
    try {
      const next = { ...subsByUrl };
      for (const u of videos) {
        const txt = await transcribeVideo(u);
        next[u] = txt || "(sin texto)";
      }
      setSubsByUrl(next);
      onToast("Subtítulos de video listos ✔", "success");
    } finally { setBusy(false); }
  }

  return (
    <div style={{ marginTop: 8, padding: 8, border: "1px dashed #bbb", borderRadius: 8 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#555" }}>Subtítulos del video:</span>
        <select value={placing} onChange={e => setPlacing(e.target.value)} style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #bbb" }}>
          <option value="bottom">Abajo</option>
          <option value="top">Arriba</option>
        </select>
        <select value={font} onChange={e => setFont(e.target.value)} style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #bbb" }}>
          <option value="Inter, system-ui, sans-serif">Inter</option>
          <option value="Poppins, system-ui, sans-serif">Poppins</option>
          <option value="Montserrat, system-ui, sans-serif">Montserrat</option>
          <option value="Oswald, system-ui, sans-serif">Oswald</option>
        </select>
        <button type="button" onClick={run} disabled={busy} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #bbb", background: "#fff" }}>
          {busy ? "Transcribiendo…" : "Generar subtítulos de video"}
        </button>
      </div>

      {Object.keys(subsByUrl).length > 0 && (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {videos.map((u, i) => (
            <div key={i} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
              <div style={{ position: "relative" }}>
                <video controls src={u} style={{ width: "100%", borderRadius: 6 }} />
                {subsByUrl[u] && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0, right: 0,
                      [placing === "bottom" ? "bottom" : "top"]: 8,
                      textAlign: "center",
                      padding: "6px 8px",
                      fontFamily: font,
                      fontSize: 14,
                      lineHeight: 1.35,
                      textShadow: "0 1px 2px rgba(0,0,0,.5)",
                      color: "#fff",
                      pointerEvents: "none",
                    }}
                  >
                    {subsByUrl[u]}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =================== Feed =================== */
export default function FeedPage() {
  const [posts, setPosts] = useState([]); const [nextCursor, setNextCursor] = useState(null);
  const [isLoading, setIsLoading] = useState(true); const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [posting, setPosting] = useState(false); const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState("usuario");
  const [orderBy, setOrderBy] = useState("recent"); const [activeTag, setActiveTag] = useState(null);
  const { show, ToastContainer } = useToast();
  const debounceMapRef = useRef(new Map());

  // Dictado
  const [dictation, setDictation] = useState({ supported: false, listening: false, interim: "" });
  const dictationRef = useRef(null);
  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    setDictation((d) => ({ ...d, supported: !!SR }));
  }, []);
  function startDictation() {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { show("Este navegador no soporta dictado (Web Speech API).", "error"); return; }
    const rec = new SR();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let finalChunk = "", interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const txt = ev.results[i][0]?.transcript || "";
        if (ev.results[i].isFinal) finalChunk += txt + " "; else interim = txt;
      }
      if (finalChunk) { setNewPost((t) => (t ? (t.endsWith(" ") ? t : t + " ") : "") + finalChunk.trim() + " "); }
      setDictation((d) => ({ ...d, interim }));
    };
    rec.onerror = (e) => { show(`Dictado: ${e?.error || "error"}`, "error"); };
    rec.onend = () => { setDictation((d) => ({ ...d, listening: false, interim: "" })); };
    try { rec.start(); setDictation((d) => ({ ...d, listening: true })); dictationRef.current = rec; }
    catch { show("No se pudo iniciar el dictado.", "error"); }
  }
  function stopDictation() { try { dictationRef.current?.stop(); } catch { } setDictation((d) => ({ ...d, listening: false })); }

  // scroll persist
  const saveTimer = useRef();
  useEffect(() => {
    const y = Number(localStorage.getItem("feed:scroll") || 0);
    if (!Number.isNaN(y)) window.scrollTo(0, y);
    const onScroll = () => { clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => localStorage.setItem("feed:scroll", String(window.scrollY)), 120); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // auth local
  useEffect(() => { const u = localStorage.getItem("feed:user"); if (u) setCurrentUser(u); }, []);
  useEffect(() => { if (currentUser) localStorage.setItem("feed:user", currentUser); }, [currentUser]);
  // carga feed (derivo audios desde el texto si el backend no los devuelve)
  const loadKeyRef = useRef(""); const lastLoadAtRef = useRef(0);
  async function loadInitial() {
    const key = `${orderBy}|${activeTag || ""}`, now = Date.now();
    if (loadKeyRef.current === key && now - lastLoadAtRef.current < 1500) return;
    loadKeyRef.current = key; lastLoadAtRef.current = now;
    setIsLoading(true); setError("");
    try {
      const r = await axiosClient.get("/api/social/feed", { params: { ...noCacheParams(), limit: 6, orderBy, tag: activeTag || "" } });
      const items = Array.isArray(r.data) ? r.data : r.data?.items ?? [];
      const cursor = Array.isArray(r.data) ? null : r.data?.nextCursor ?? null;

      const normalized = items.map((p) => {
        const urls = extractUrls(p.text || "");
        const derivedAudios = urls.filter(isAudio);
        return {
          ...p,
          comments: dedupeComments(p.comments || []),
          audios: Array.isArray(p.audios) && p.audios.length ? p.audios : derivedAudios
        };
      });

      setPosts(dedupePosts(normalized));
      setNextCursor(cursor || null);
    } catch (e) { setError(e.message); show("No se pudo cargar el feed", "error"); }
    finally { setIsLoading(false); }
  }
  useEffect(() => { loadInitial(); /* eslint-disable-line */ }, [orderBy, activeTag]);

  const lastCursorRef = useRef(null);
  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    if (lastCursorRef.current === nextCursor) return;
    lastCursorRef.current = nextCursor; setIsLoadingMore(true);
    try {
      const r = await axiosClient.get("/api/social/feed", { params: { ...noCacheParams(), cursor: nextCursor, limit: 6, orderBy, tag: activeTag || "" } });
      const items = Array.isArray(r.data) ? r.data : r.data?.items ?? []; const cursor = Array.isArray(r.data) ? null : r.data?.nextCursor ?? null;

      const normalized = items.map((p) => {
        const urls = extractUrls(p.text || "");
        const derivedAudios = urls.filter(isAudio);
        return {
          ...p,
          comments: dedupeComments(p.comments || []),
          audios: Array.isArray(p.audios) && p.audios.length ? p.audios : derivedAudios
        };
      });

      setPosts((prev) => dedupePosts([...prev, ...normalized]));
      setNextCursor(cursor || null);
    } catch { show("No se pudo cargar más", "error"); }
    finally { setIsLoadingMore(false); }
  }

  /* ---------- Crear post ---------- */
  const [newPost, setNewPost] = useState("");
  const [attachments, setAttachments] = useState({ images: [], videos: [], audios: [] });
  const [recPreviewUrl, setRecPreviewUrl] = useState(null);
  const lastAudioBlobRef = useRef(null);
  const lastAudioMimeRef = useRef(null);
  const lastAudioDataUrlRef = useRef(null);
  const videoLiveRef = useRef(null);
  const [videoLiveOn, setVideoLiveOn] = useState(false);
  const [videoLocalUrl, setVideoLocalUrl] = useState(null);
  const videoStreamRef = useRef(null);
  const lastVideoBlobRef = useRef(null);
  const [effectMain, setEffectMain] = useState("none");
  const [videoFilterMain, setVideoFilterMain] = useState("none");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const [selectedTargets, setSelectedTargets] = useState({
    telegram: { enabled: true, placement: "chat" },
    facebook: { enabled: true, placement: "feed" },
    x: { enabled: false, placement: "feed" },
    instagram: { enabled: false, placement: "feed" },
    linkedin: { enabled: false, placement: "feed" },
    tiktok: { enabled: false, placement: "feed" },
    whatsapp: { enabled: false, placement: "status" },
  });

  // NUEVO: controles calecita (fotos) y encadenado (videos)
  const [carouselEffect, setCarouselEffect] = useState("slide"); // "slide" | "fade"
  const [carouselInterval, setCarouselInterval] = useState(3000); // ms
  const [videoAutoChain, setVideoAutoChain] = useState(true);

  const fileInputRef = useRef(null);
  async function handlePickFile() { fileInputRef.current?.click(); }
  async function onFileChange(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setIsUploadingMedia(true);
    try {
      const url = await uploadBlobMultipart(f.name, f.type, f);
      if (/^image\//i.test(f.type)) {
        setAttachments(a => ({ ...a, images: [...a.images, url] }));
      } else if (/^audio\//i.test(f.type)) {
        setAttachments(a => ({ ...a, audios: [...(a.audios || []), url] }));
      } else if (/^video\//i.test(f.type)) {
        setAttachments(a => ({ ...a, videos: [...(a.videos || []), url] }));
      }
      show("Adjunto agregado ✔", "success");
    } catch {
      show("No se pudo subir el archivo", "error");
    } finally {
      setIsUploadingMedia(false);
      e.target.value = "";
    }
  }

  const cameraInputRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const videoRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  function handleOpenCamera() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) cameraInputRef.current?.click();
    else openCameraFallback();
  }
  async function openCameraFallback() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { });
        }
      }, 50);
    } catch {
      show("No se pudo acceder a la cámara", "error");
    }
  }
  function closeCameraFallback() {
    try { cameraStreamRef.current?.getTracks().forEach(t => t.stop()); } catch { }
    cameraStreamRef.current = null;
    setCameraOpen(false);
  }
  async function takePhotoFallback() {
    try {
      setIsUploadingMedia(true);
      const video = videoRef.current;
      if (!video) return;
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const resp = await fetch(dataUrl);
      const blob = await resp.blob();
      const url = await uploadBlobMultipart("photo.jpg", "image/jpeg", blob);
      if (url) setAttachments(a => ({ ...a, images: [...a.images, url] }));
      show("Foto agregada ✔", "success");
      closeCameraFallback();
    } catch {
      show("No se pudo tomar la foto", "error");
    } finally {
      setIsUploadingMedia(false);
    }
  }

  const [rec, setRec] = useState({ recording: false, seconds: 0 });
  const mediaRecRef = useRef(null); const recTimerRef = useRef(null);
  const HARD_LIMIT_SEC = 60;
  const hardStopRef = useRef(null);

  function pickAudioMime() {
    const cands = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
    for (const t of cands) { if (window.MediaRecorder?.isTypeSupported?.(t)) return t; }
    return "";
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickAudioMime();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        clearInterval(recTimerRef.current);
        clearTimeout(hardStopRef.current);
        setRec(r => ({ ...r, recording: false, seconds: 0 }));
        try {
          const blobType = mr.mimeType || mimeType || "audio/webm";
          let blob = new Blob(chunks, { type: blobType });

          lastAudioBlobRef.current = blob;
          lastAudioMimeRef.current = blobType;

          const localUrl = URL.createObjectURL(blob);
          setRecPreviewUrl(localUrl);

          setIsUploadingMedia(true);

          try {
            blob = await applyVoiceEffectToBlob(effectMain, blob);
          } catch { show("No se pudo aplicar efecto, subiendo original.", "info") }

          const url = await uploadBlobMultipart(
            blob.type.endsWith("wav") ? "rec.wav" : "rec.webm",
            blob.type,
            blob,
            { name: "rec", effect: effectMain }
          );
          if (!url) throw new Error("upload-sin-url");

          const dataUrl = await blobToDataURL(blob);
          lastAudioDataUrlRef.current = dataUrl;

          setAttachments(a => ({ ...a, audios: [...(a.audios || []), url] }));
          show("Grabación subida ✔", "success");
        } catch {
          show("No se pudo subir la grabación", "error");
        } finally {
          setIsUploadingMedia(false);
          try { stream.getTracks().forEach(t => t.stop()); } catch { }
        }
      };
      mediaRecRef.current = mr;
      mr.start();
      setRec({ recording: true, seconds: 0 });
      recTimerRef.current = setInterval(() => setRec(r => ({ ...r, seconds: r.seconds + 1 })), 1000);
      hardStopRef.current = setTimeout(() => { try { mr.stop(); } catch { } }, HARD_LIMIT_SEC * 1000);
    } catch {
      show("No se pudo acceder al micrófono", "error");
    }
  }
  function stopRecording() { try { clearTimeout(hardStopRef.current); } catch {} try { mediaRecRef.current?.stop(); } catch {} }

  async function reprocessLastAudio(newEffect = "deep") {
    const srcBlob = lastAudioBlobRef.current;
    if (!srcBlob) return show("No hay audio para reprocesar", "error");
    try {
      show("Reprocesando audio…", "info");
      const outBlob = await applyVoiceEffectToBlob(newEffect, srcBlob);
      const url = await uploadBlobMultipart(outBlob.type.endsWith("wav") ? "rec-reproc.wav" : "rec-reproc.webm", outBlob.type, outBlob, { name: "rec-reproc", effect: newEffect });
      if (url) {
        setAttachments(a => ({ ...a, audios: [...(a.audios || []), url] }));
        show("Audio reprocesado ✔", "success");
      } else {
        show("No se obtuvo URL del audio reprocesado", "error");
      }
    } catch { show("No se pudo reprocesar el audio", "error"); }
  }

  const [videoRec, setVideoRec] = useState({ recording: false, seconds: 0 });
  const videoMediaRecRef = useRef(null);
  const videoTimerRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  function cssForVideoFilter(f) {
    switch (f) {
      case "noir": return "grayscale(1) contrast(1.2)";
      case "warm": return "sepia(0.6) saturate(1.3)";
      case "cool": return "contrast(1.1) hue-rotate(180deg)";
      case "comic": return "contrast(1.8) saturate(1.7) brightness(1.1)";
      default: return "none";
    }
  }
  function pickVideoMime() {
    const cands = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/mp4"];
    for (const t of cands) { if (window.MediaRecorder?.isTypeSupported?.(t)) return t; }
    return "video/webm";
  }

  async function createProcessedMicTrack(effect, srcStream) {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const source = ac.createMediaStreamSource(srcStream);
    let node = source;

    switch (effect) {
      case "robot": {
        const osc = ac.createOscillator();
        const modGain = ac.createGain();
        const gain = ac.createGain();
        osc.frequency.value = 60;
        osc.start();
        modGain.gain.value = 0.5;
        osc.connect(modGain);
        modGain.connect(gain.gain);
        node.connect(gain);
        node = gain;
        break;
      }
      case "deep": {
        const biq = ac.createBiquadFilter();
        biq.type = "lowshelf";
        biq.frequency.value = 200;
        biq.gain.value = 8;
        node.connect(biq);
        node = biq;
        break;
      }
      case "hall": {
        const delay = ac.createDelay();
        delay.delayTime.value = 0.18;
        const fb = ac.createGain();
        fb.gain.value = 0.35;
        node.connect(delay); delay.connect(fb); fb.connect(delay);
        node = delay;
        break;
      }
      case "chipmunk": {
        const dest = ac.createMediaStreamDestination();
        node.connect(dest);
        const track = dest.stream.getAudioTracks()[0];
        track.addEventListener?.("ended", () => { try { ac.close(); } catch {} });
        return track;
      }
      default: {
        const dest = ac.createMediaStreamDestination();
        node.connect(dest);
        const track = dest.stream.getAudioTracks()[0];
        track.addEventListener?.("ended", () => { try { ac.close(); } catch {} });
        return track;
      }
    }

    const dest = ac.createMediaStreamDestination();
    node.connect(dest);
    const track = dest.stream.getAudioTracks()[0];
    track.addEventListener?.("ended", () => { try { ac.close(); } catch {} });
    return track;
  }
  async function startVideoRecording() {
    try {
      if (cameraOpen) closeCameraFallback();
      if (videoRec.recording) return;

      try { if (videoLiveRef.current) videoLiveRef.current.srcObject = null; } catch {}

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoStreamRef.current = stream;

      setVideoLiveOn(true);
      setTimeout(() => {
        if (videoLiveRef.current) {
          videoLiveRef.current.srcObject = stream;
          videoLiveRef.current.muted = true;
          videoLiveRef.current.playsInline = true;
          videoLiveRef.current.play().catch(() => { });
        }
      }, 30);

      const videoEl = document.createElement("video");
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      await videoEl.play().catch(() => { });

      const canvas = document.createElement("canvas");
      canvasRef.current = canvas;
      canvas.width = videoEl.videoWidth || 640;
      canvas.height = videoEl.videoHeight || 480;
      const ctx = canvas.getContext("2d");

      const draw = () => {
        try {
          ctx.filter = cssForVideoFilter(videoFilterMain);
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        } catch { }
        rafRef.current = requestAnimationFrame(draw);
      };
      rafRef.current = requestAnimationFrame(draw);

      const canvasStream = canvas.captureStream ? canvas.captureStream(30) : null;
      if (!canvasStream) throw new Error("Canvas Capture not supported");

      const rawTrack = stream.getAudioTracks()[0];
      if (rawTrack) {
        try {
          const processedTrack = await createProcessedMicTrack(effectMain, stream);
          canvasStream.addTrack(processedTrack || rawTrack);
        } catch {
          canvasStream.addTrack(rawTrack);
        }
      }

      const mimeType = pickVideoMime();
      const mr = new MediaRecorder(canvasStream, { mimeType });
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        cancelAnimationFrame(rafRef.current || 0);
        clearInterval(videoTimerRef.current);
        setVideoRec({ recording: false, seconds: 0 });
        setVideoLiveOn(false);
        try { if (videoLiveRef.current) videoLiveRef.current.srcObject = null; } catch {}

        try {
          const blob = new Blob(chunks, { type: mr.mimeType || mimeType });
          lastVideoBlobRef.current = blob;
          const localUrl = URL.createObjectURL(blob);
          setVideoLocalUrl(localUrl);

          setIsUploadingMedia(true);
          const url = await uploadBlobMultipart("video.webm", blob.type, blob, { effect: videoFilterMain });
          if (url) {
            setAttachments(a => ({ ...a, videos: [...(a.videos || []), url] }));
            show("Video subido ✔", "success");
            setVideoLocalUrl(null); // ← evita duplicado (preview + adjunto)
          } else {
            show("No se obtuvo URL del video subido", "error");
          }
        } catch {
          show("No se pudo subir el video", "error");
        } finally {
          setIsUploadingMedia(false);
          try { stream.getTracks().forEach(t => t.stop()); } catch { }
          videoStreamRef.current = null;
        }
      };

      videoMediaRecRef.current = mr;
      mr.start();
      setVideoRec({ recording: true, seconds: 0 });
      videoTimerRef.current = setInterval(() => setVideoRec(r => ({ ...r, seconds: r.seconds + 1 })), 1000);
      show("Grabando video…", "info");
    } catch(err) {
      console.error("Video recording failed:", err);
      show("No se pudo iniciar la grabación de video. Puede que tu navegador no sea compatible con esta función.", "error");
    }
  }
  function stopVideoRecording() { try { videoMediaRecRef.current?.stop(); } catch { } }

  // Reproceso último video (cierra preview para que se vea el reprocesado)
  async function reprocessLastVideo(newFilter = "noir") {
    if (!lastVideoBlobRef.current) return show("No hay video para reprocesar", "error");
    try {
      setIsUploadingMedia(true);
      show("Reprocesando video…", "info");
      const srcBlob = lastVideoBlobRef.current;
      const srcUrl = URL.createObjectURL(srcBlob);
      const videoEl = document.createElement("video");
      videoEl.src = srcUrl;
      videoEl.muted = true;
      videoEl.playsInline = true;
      await videoEl.play().catch(() => {});
      await new Promise(res => videoEl.onloadedmetadata = res);

      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth || 640;
      canvas.height = videoEl.videoHeight || 480;
      const ctx = canvas.getContext("2d");

      const cssForVideoFilter = (f) => {
        switch (f) {
          case "noir": return "grayscale(1) contrast(1.2)";
          case "warm": return "sepia(0.6) saturate(1.3)";
          case "cool": return "contrast(1.1) hue-rotate(180deg)";
          case "comic": return "contrast(1.8) saturate(1.7) brightness(1.1)";
          default: return "none";
        }
      };

      let raf = 0;
      const draw = () => {
        try {
          ctx.filter = cssForVideoFilter(newFilter);
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        } catch {}
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);

      const stream = canvas.captureStream(30);
      const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        cancelAnimationFrame(raf);
        const outBlob = new Blob(chunks, { type: mr.mimeType });
        const url = await uploadBlobMultipart("video-reproc.webm", outBlob.type, outBlob, { effect: newFilter });
        if (url) {
          setAttachments(a => ({ ...a, videos: [...(a.videos || []), url] }));
          setVideoLocalUrl(null);
          show("Video reprocesado ✔", "success");
        } else {
          show("No se obtuvo URL del reprocesado", "error");
        }
        setIsUploadingMedia(false);
      };
      mr.start();
      videoEl.onended = () => { try { mr.stop(); } catch {} };
    } catch {
      setIsUploadingMedia(false);
      show("No se pudo reprocesar el video", "error");
    }
  }

  // Reproceso de un video adjunto (CORS + estado de carga)
  async function reprocessVideoUrlWithFilter(url, filter = "noir", indexToReplace = -1) {
    try {
      setIsUploadingMedia(true);
      show("Aplicando filtro al video…", "info");

      const videoEl = document.createElement("video");
      videoEl.crossOrigin = "anonymous";
      videoEl.src = url;
      videoEl.muted = true;
      videoEl.playsInline = true;
      await videoEl.play().catch(() => {});
      await new Promise(res => videoEl.onloadedmetadata = res);

      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth || 640;
      canvas.height = videoEl.videoHeight || 480;
      const ctx = canvas.getContext("2d");

      const cssMap = {
        noir: "grayscale(1) contrast(1.2)",
        warm: "sepia(0.6) saturate(1.3)",
        cool: "contrast(1.1) hue-rotate(180deg)",
        comic: "contrast(1.8) saturate(1.7) brightness(1.1)",
        none: "none",
      };
      let raf = 0;
      const draw = () => { try { ctx.filter = cssMap[filter] || "none"; ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height); } catch {} raf = requestAnimationFrame(draw); };
      raf = requestAnimationFrame(draw);

      const stream = canvas.captureStream(30);
      const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        cancelAnimationFrame(raf);
        try {
          const outBlob = new Blob(chunks, { type: mr.mimeType });
          const urlOut = await uploadBlobMultipart("video-filter.webm", outBlob.type, outBlob, { effect: filter });
          if (urlOut) {
            setAttachments(a => ({ ...a, videos: a.videos.map((x, i) => (i === indexToReplace ? urlOut : x)) }));
            show("Filtro aplicado al video ✔", "success");
          } else {
            show("No se pudo obtener URL del video reprocesado", "error");
          }
        } finally {
          setIsUploadingMedia(false);
        }
      };
      mr.start();
      videoEl.onended = () => { try { mr.stop(); } catch {} };
    } catch {
      setIsUploadingMedia(false);
      show("No se pudo reprocesar ese video", "error");
    }
  }
  const audioInputRef = useRef(null);
  const [showTranscribeMenu, setShowTranscribeMenu] = useState(false);

  async function onAudioChangeForTranscribe(e) {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      show("Transcribiendo…", "info");
      const dataUrl = await blobToDataURL(f);
      const r = await axiosClient.post("/api/transcribe", { audioData: dataUrl, type: f.type });
      const txt = r.data?.text || r.data?.message || "";
      if (txt) setNewPost((t) => (t ? (t.endsWith(" ") ? t : t + " ") + txt : txt));
      show("Transcripción lista ✔", "success");
    } catch { show("No se pudo transcribir", "error"); }
    finally { e.target.value = ""; }
  }

  async function transcribeLastRecording() {
    try {
      show("Transcribiendo…", "info");
      let dataUrl = null;
      let type = "audio/webm";

      if (lastAudioDataUrlRef.current) {
        dataUrl = lastAudioDataUrlRef.current;
        type = lastAudioMimeRef.current || "audio/webm";
      } else if (lastAudioBlobRef.current) {
        dataUrl = await blobToDataURL(lastAudioBlobRef.current);
        type = lastAudioMimeRef.current || "audio/webm";
      } else {
        const src = (attachments.audios && attachments.audios[attachments.audios.length - 1]) || recPreviewUrl;
        if (!src) { show("No hay grabación para transcribir", "error"); return; }
        type = /\.ogg(\?|$)/i.test(src) ? "audio/ogg"
          : /\.mp3(\?|$)/i.test(src) ? "audio/mpeg"
          : /\.m4a(\?|$)/i.test(src) ? "audio/mp4"
          : "audio/webm";
        dataUrl = await urlToDataURL(src);
      }

      const r = await axiosClient.post("/api/transcribe", { audioData: dataUrl, type });
      const txt = r.data?.text || r.data?.message || "";
      if (txt) {
        setNewPost(t => (t ? (t.endsWith(" ") ? t : t + " ") + txt : txt));
        show("Transcripción lista ✔", "success");
      } else {
        show("No se obtuvo texto de la transcripción", "error");
      }
    } catch {
      show("No se pudo transcribir la grabación. Probá 'Dictado en vivo (sin servidor)'.", "error");
    }
  }

  function renderTargetPickers() {
    const placements = {
      telegram: [{ v: "chat", label: "chat/canal" }],
      facebook: [{ v: "feed", label: "feed" }, { v: "story", label: "story" }],
      x: [{ v: "feed", label: "feed" }],
      instagram: [{ v: "feed", label: "feed" }, { v: "story", label: "story" }],
      linkedin: [{ v: "feed", label: "feed" }],
      tiktok: [{ v: "feed", label: "feed" }],
      whatsapp: [{ v: "status", label: "status" }, { v: "chatBroadcast", label: "broadcast" }],
    };
    return (
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, fontSize: 13 }}>
        {Object.entries(selectedTargets).map(([ch, cfg]) => (
          <div key={ch} style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #eee", padding: "6px 8px", borderRadius: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={cfg.enabled} onChange={(e) => setSelectedTargets((prev) => ({ ...prev, [ch]: { ...prev[ch], enabled: e.target.checked } }))} />
              {ch}
            </label>
            <select
              value={cfg.placement}
              onChange={(e) =>
                setSelectedTargets((prev) => ({
                  ...prev,
                  [ch]: { ...prev[ch], placement: e.target.value },
                }))
              }
              disabled={!cfg.enabled}
              style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #bbb" }}
              title="Ubicación"
            >
              {placements[ch].map((p) => (
                <option key={p.v} value={p.v}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  async function crearPost(e) {
    e.preventDefault();
    const hasContent =
      newPost.trim() ||
      attachments.images.length ||
      attachments.videos?.length ||
      attachments.audios?.length ||
      recPreviewUrl;

    if (!hasContent) { show("Agrega texto, imagen, audio o video antes de publicar", "error"); return; }
    if (isUploadingMedia) { show("Esperá a que termine la subida de medios", "error"); return; }

    setPosting(true);
    setError("");

    // fallback: URLs de audios al final (para backend)
    const audiosAsLinks = (attachments.audios || []).map((u) => ` ${u}`).join("");
    const safeText = (newPost || "") + (audiosAsLinks || "");

    const tempId = Date.now();
    const tempPost = {
      id: tempId,
      author: currentUser,
      text: newPost, // ← solo texto en UI (sin URLs)
      createdAt: Date.now(),
      reactions: { like: 0, dislike: 0, favorite: 0, not_interested: 0 },
      userReactions: {},
      comments: [],
      channelStates: {},
      images: attachments.images.slice(),
      videos: (attachments.videos || []).slice(),
      audioUrl: (attachments.audios && attachments.audios[0]) || null,
      audios: (attachments.audios || []).slice(),
      income: { tips: 0, total: 0 },
    };
    setPosts((prev) => dedupePosts([tempPost, ...prev]));

    const payload = {
      text: safeText,
      images: attachments.images,
      videos: attachments.videos || [],
      audioUrl: (attachments.audios && attachments.audios[0]) || null,
      audios: attachments.audios || [],
    };

    const prevState = { newPost, attachments: { ...attachments }, recPreviewUrl, videoLocalUrl };

    // limpiar UI
    setNewPost("");
    setAttachments({ images: [], videos: [], audios: [] });
    setRecPreviewUrl(null);
    setVideoLocalUrl(null);

    try {
      const created = await axiosClient.post("/api/social/feed", payload, { headers: { "X-User-Id": currentUser } });
      const postId = created?.data?.post?.id;

      if (postId) {
        await axiosClient.post(
          "/api/social/publish",
          { postId, targets: selectedTargets },
          { headers: { "X-User-Id": currentUser } }
        );
      }

      const enabledCount = Object.values(selectedTargets).filter((t) => t.enabled).length;
      show(`Publicado ✓ | Canales seleccionados: ${enabledCount}`, "success");
      await loadInitial();
    } catch (e2) {
      const msg = e2?.response?.data?.message || e2?.message || "Error al publicar";
      console.error("POST /api/social/feed ->", e2?.response?.status, e2?.response?.data);
      setPosts((prev) => prev.filter((p) => p.id !== tempId));
      setError(msg);
      show(`Error al publicar: ${msg}`, "error");
      setNewPost(prevState.newPost);
      setAttachments(prevState.attachments);
      setRecPreviewUrl(prevState.recPreviewUrl);
      setVideoLocalUrl(prevState.videoLocalUrl);
    } finally {
      setPosting(false);
    }
  }

  function debounceByKey(key, fn, ms = 300) {
    const m = debounceMapRef.current;
    if (m.has(key)) clearTimeout(m.get(key));
    const t = setTimeout(fn, ms);
    m.set(key, t);
  }

  function reactPostOptimistic(postId, type) {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const prevType = p.userReactions?.[currentUser] || null;
        if (prevType === type) return p;
        const next = { ...p };
        next.reactions = { ...next.reactions };
        next.userReactions = { ...(next.userReactions || {}) };
        if (prevType && next.reactions[prevType] > 0) next.reactions[prevType] -= 1;
        next.userReactions[currentUser] = type;
        next.reactions[type] = (next.reactions[type] || 0) + 1;
        return next;
      })
    );
    debounceByKey(`post:${postId}:${currentUser}`, async () => {
      try {
        await axiosClient.post("/api/social/feed/react", { postId, type }, { headers: { "X-User-Id": currentUser } });
      } catch {
        show("No se pudo registrar la reacción", "error");
        await loadInitial();
      }
    });
  }

  function reactCommentOptimistic(postId, commentIndex, type) {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const next = { ...p, comments: p.comments.map((c) => ({ ...c })) };
        const c = next.comments[commentIndex];
        if (!c) return p;
        c.reactions = { like: 0, dislike: 0, favorite: 0, not_interested: 0, ...c.reactions };
        c.userReactions = { ...(c.userReactions || {}) };
        const prevType = c.userReactions[currentUser] || null;
        if (prevType === type) return p;
        if (prevType && c.reactions[prevType] > 0) c.reactions[prevType] -= 1;
        c.userReactions[currentUser] = type;
        c.reactions[type] = (c.reactions[type] || 0) + 1;
        return next;
      })
    );
    debounceByKey(`comment:${postId}:${commentIndex}:${currentUser}`, async () => {
      try {
        await axiosClient.post("/api/social/feed/comment-react", { postId, commentIndex, type, userId: currentUser }, { headers: { "X-User-Id": currentUser } });
      } catch {
        show("No se pudo registrar la reacción", "error");
        await loadInitial();
      }
    });
  }

  function addCommentOptimistic(postId, text, whisper = false, audioUrl = null) {
    const tempComment = {
      author: currentUser,
      text,
      whisper: !!whisper,
      audioUrl,
      reactions: { like: 0, dislike: 0, favorite: 0, not_interested: 0 },
      userReactions: {},
    };
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: dedupeComments([...(p.comments || []), tempComment]) } : p
      )
    );
    axiosClient
      .post("/api/social/feed/comment", { postId, text, whisper, audioUrl }, { headers: { "X-User-Id": currentUser } })
      .then(() => show("Comentario agregado ✔", "success"))
      .catch(() => { show("Error al comentar", "error"); loadInitial(); });
  }

  async function deletePost(postId) {
    if (!confirm("¿Eliminar este post? Esta acción no se puede deshacer.")) return;
    const prev = posts.slice();
    setPosts((cur) => cur.filter((p) => p.id !== postId));
    try {
      await axiosClient.delete("/api/social/feed", { data: { postId }, headers: { "X-User-Id": currentUser } });
      show("Post eliminado ✔", "success");
    } catch {
      show("No se pudo eliminar el post", "error");
      setPosts(prev);
    }
  }

  // Notificaciones
  const [notif, setNotif] = useState({ items: [], unread: 0, open: false });
  async function refreshNotif() {
    try {
      const r = await axiosClient.get("/api/notifications", { params: { user: currentUser, _t: Date.now() } });
      setNotif((n) => ({ ...n, items: r.data?.items || [], unread: r.data?.unread || 0 }));
    } catch {}
  }
  useEffect(() => {
    refreshNotif();
    const id = setInterval(refreshNotif, 5000);
    return () => clearInterval(id);
  }, [currentUser]);
  async function markAllRead() {
    try {
      await axiosClient.post("/api/notifications/mark-read", { user: currentUser, ids: [] });
      refreshNotif();
    } catch {}
  }

  // Tendencias y métricas
  const trends = useMemo(() => {
    const count = new Map();
    posts.forEach((p) => extractTags(p.text).forEach((t) => count.set(t, (count.get(t) || 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag]) => ({ tag }));
  }, [posts]);

  const visibleIds = useMemo(() => posts.slice(0, 10).map((p) => p.id), [posts]);
  const metricsMap = useMetricsBatch(visibleIds);

  // Carga infinita
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextCursor) return;
    const io = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) loadMore(); }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [nextCursor, isLoadingMore, orderBy, activeTag]);

  // Reprocesado de imagen
  async function reprocessImageUrlWithFilter(url, filter = "noir") {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");

    const css = ({ noir: "grayscale(1) contrast(1.2)", warm: "sepia(0.6) saturate(1.3)", cool: "contrast(1.1) hue-rotate(180deg)", comic: "contrast(1.8) saturate(1.7) brightness(1.1)", none: "none" }[filter] || "none");

    ctx.filter = css;
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9));
    const urlOut = await uploadBlobMultipart("photo-filter.jpg", "image/jpeg", blob, { effect: filter });
    return urlOut;
  }

  // ======= UI =======
  const [audioPostEffect, setAudioPostEffect] = useState("deep");
  const [videoPostFilter, setVideoPostFilter] = useState("noir");

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <ToastContainer />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Red social y económico</h1>
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <button onClick={() => setNotif((n) => ({ ...n, open: !n.open }))} title="Notificaciones" style={{ border
            : "1px solid #bbb", borderRadius: 8, background: "#fff", padding: "6px 10px" }}
>
  🔔 {notif.unread > 0 ? <b>{notif.unread}</b> : 0}
</button>

{notif.open && (
  <div
    style={{
      position: "absolute",
      right: 0,
      top: "110%",
      background: "#fff",
      border: "1px solid #ddd",
      borderRadius: 10,
      padding: 10,
      width: 320,
      boxShadow: "0 8px 24px rgba(0,0,0,.08)",
      zIndex: 10,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
      <b style={{ fontSize: 14 }}>Notificaciones</b>
      <button onClick={markAllRead} style={{ marginLeft: "auto", fontSize: 12 }}>
        Marcar leídas
      </button>
    </div>
    {notif.items.length === 0 ? (
      <div style={{ fontSize: 13, color: "#777" }}>Sin notificaciones</div>
    ) : (
      <ul style={{ paddingLeft: 16, margin: 0 }}>
        {notif.items
          .slice()
          .reverse()
          .map((n) => (
            <li key={n.id} style={{ marginBottom: 6, fontSize: 13 }}>
              {n.message}{" "}
              <em style={{ color: "#999" }}>{new Date(n.at).toLocaleString()}</em>{" "}
              {!n.readAt && <b style={{ color: "#d25" }}>•</b>}
            </li>
          ))}
      </ul>
    )}
  </div>
)}
</div>

<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <label style={{ fontSize: 14, color: "#555" }}>Usuario:</label>
  <input
    value={currentUser}
    onChange={(e) => setCurrentUser(e.target.value || "usuario")}
    style={{ padding: "6px 8px", border: "1px solid #bbb", borderRadius: 6, minWidth: 120 }}
    maxLength={24}
    title="Nombre del usuario actual (se guarda en este navegador)"
  />
</div>
</div>
<form onSubmit={crearPost} style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
  <div style={{ flex: 1 }}>
    <textarea
      value={newPost}
      onChange={(e) => setNewPost(e.target.value)}
      placeholder="Escribe un post, agrega medios o #tendencia…"
      style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #bbb", minHeight: 70 }}
      maxLength={2000}
    />
    {renderMediaFromText(newPost)}

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
      <button type="button" onClick={handlePickFile} style={{ border: "1px solid #bbb", borderRadius: 8, background: "#fff", padding: "6px 10px" }}>
        📎 Archivo
      </button>
      <input ref={fileInputRef} type="file" accept="image/*,audio/*,video/*" onChange={onFileChange} hidden />

      <button type="button" onClick={handleOpenCamera} style={{ border: "1px solid #bbb", borderRadius: 8, background: "#fff", padding: "6px 10px" }}>
        📷 Cámara
      </button>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} hidden />

      <button type="button" onClick={startVideoRecording} style={{ border: "1px solid #bbb", borderRadius: 8, background: "#fff", padding: "6px 10px" }}>
        🎥 Video
      </button>
      {videoRec.recording && (
        <button
          type="button"
          onClick={stopVideoRecording}
          style={{ border: "1px solid #f55", color: "#f55", borderRadius: 8, background: "#fff", padding: "6px 10px" }}
        >
          ⏹ Detener video ({videoRec.seconds}s)
        </button>
      )}

      {!rec.recording ? (
        <button
          type="button"
          onClick={startRecording}
          style={{ border: "1px solid #bbb", borderRadius: 8, background: "#fff", padding: "6px 10px" }}
          title="Grabar audio"
        >
          🎙 Grabar
        </button>
      ) : (
        <button
          type="button"
          onClick={stopRecording}
          style={{ border: "1px solid #f55", color: "#f55", borderRadius: 8, background: "#fff", padding: "6px 10px" }}
          title="Detener"
        >
          ⏹ Detener ({rec.seconds}s / 60s)
        </button>
      )}

      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setShowTranscribeMenu((s) => !s)}
          style={{ border: "1px solid #bbb", borderRadius: 8, background: "#fff", padding: "6px 10px" }}
        >
          🗣 Transcribir
        </button>
        {showTranscribeMenu && (
          <div
            style={{
              position: "absolute", zIndex: 50, background: "#fff", border: "1px solid #ddd",
              borderRadius: 8, padding: 6, marginTop: 4, minWidth: 220,
            }}
          >
            {dictation.supported ? (
              dictation.listening ? (
                <button
                  type="button"
                  onClick={() => { setShowTranscribeMenu(false); stopDictation(); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px" }}
                >
                  ⏹ Detener dictado (sin servidor)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setShowTranscribeMenu(false); startDictation(); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px" }}
                >
                  🎤 Dictado en vivo (sin servidor)
                </button>
              )
            ) : (
              <div style={{ padding: "6px 8px", fontSize: 12, color: "#666" }}>Dictado en vivo no soportado</div>
            )}
            <button
              type="button"
              onClick={() => { setShowTranscribeMenu(false); transcribeLastRecording(); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px" }}
            >
              Última grabación (servidor)
            </button>
            <label style={{ display: "block", width: "100%" }}>
              <span style={{ display: "block", padding: "6px 8px", cursor: "pointer" }}>Desde archivo… (servidor)</span>
              <input ref={audioInputRef} type="file" accept="audio/*" onChange={onAudioChangeForTranscribe} hidden />
            </label>
          </div>
        )}
      </div>

      {/* Controles de efecto de voz y filtro de video principal */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <label style={{ fontSize: 12, color: "#555" }}>Efecto voz:</label>
        <select
          value={effectMain}
          onChange={(e) => setEffectMain(e.target.value)}
          style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #bbb" }}
          disabled={rec.recording}
        >
          <option value="none">None</option>
          <option value="robot">Robot</option>
          <option value="deep">Deep</option>
          <option value="chipmunk">Chipmunk</option>
          <option value="hall">Hall</option>
        </select>
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <label style={{ fontSize: 12, color: "#555" }}>Filtro video:</label>
        <select
          value={videoFilterMain}
          onChange={(e) => setVideoFilterMain(e.target.value)}
          style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #bbb" }}
          disabled={videoRec.recording}
        >
          <option value="none">None</option>
          <option value="noir">Noir</option>
          <option value="warm">Warm</option>
          <option value="cool">Cool</option>
          <option value="comic">Comic</option>
        </select>
      </div>

      {/* Controles de calecita de fotos y encadenado de videos */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "#555" }}>Calecita:</label>
          <select
            value={carouselEffect}
            onChange={(e) => setCarouselEffect(e.target.value)}
            style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #bbb" }}
          >
            <option value="slide">Slide</option>
            <option value="fade">Fade</option>
          </select>
          <input
            type="number"
            min={800}
            step={200}
            value={carouselInterval}
            onChange={(e) => setCarouselInterval(Math.max(800, Number(e.target.value) || 3000))}
            title="Intervalo (ms)"
            style={{ width: 90, padding: "4px 6px", borderRadius: 6, border: "1px solid #bbb" }}
          />
          <span style={{ fontSize: 12, color: "#555" }}>ms</span>
        </div>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555" }}>
          <input type="checkbox" checked={videoAutoChain} onChange={(e) => setVideoAutoChain(e.target.checked)} />
          Encadenar videos
        </label>

        {dictation.listening && (
          <span style={{ fontSize: 12, color: "#6b25d7" }}>
            ● Dictando… {dictation.interim}
          </span>
        )}
      </div>
    </div>
    {/* Vista previa de video en vivo */}
    {videoLiveOn && (
      <div style={{ marginTop: 8 }}>
        <video
          ref={videoLiveRef}
          style={{ width: "100%", borderRadius: 8, filter: cssForVideoFilter(videoFilterMain) }}
          playsInline
          muted
        />
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          Grabando… vista previa en vivo
        </div>
      </div>
    )}

    {/* Preview local del último video grabado */}
    {videoLocalUrl && (
      <div style={{ marginTop: 8 }}>
        <video src={videoLocalUrl} controls style={{ width: "100%", borderRadius: 8 }} />
        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => { setVideoLocalUrl(null); }}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #bbb", background: "#fff" }}
          >
            Quitar preview
          </button>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 12, color: "#555" }}>Reprocesar con:</label>
            <select
              value={videoPostFilter}
              onChange={(e) => setVideoPostFilter(e.target.value)}
              style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #bbb" }}
            >
              <option value="noir">Noir</option>
              <option value="warm">Warm</option>
              <option value="cool">Cool</option>
              <option value="comic">Comic</option>
            </select>
            <button
              type="button"
              onClick={() => reprocessLastVideo(videoPostFilter)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #bbb", background: "#fff" }}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Previews de IMAGEN con filtros por imagen */}
    {attachments.images.length > 0 && (
      <div style={{ marginTop: 8 }}>
        {attachments.images.map((src, i) => (
          <div key={i} style={{ marginBottom: "12px", width: "100%", position: "relative" }}>
            <img src={src} alt={`img-${i}`} style={{ width: "100%", borderRadius: 8 }} />
            <div style={{ position: "absolute", left: 8, top: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["noir", "warm", "cool", "comic"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={async () => {
                    setIsUploadingMedia(true);
                    try {
                      const u = await reprocessImageUrlWithFilter(src, f);
                      setAttachments((a) => ({ ...a, images: a.images.map((x, idx) => (idx === i ? u || x : x)) }));
                      show("Filtro aplicado ✔", "success");
                    } catch {
                      show("No se pudo aplicar el filtro", "error");
                    } finally {
                      setIsUploadingMedia(false);
                    }
                  }}
                  style={{ fontSize: 11, padding: "2px 6px", borderRadius: 12, border: "1px solid #ddd", background: "#fff" }}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setAttachments((a) => ({ ...a, images: a.images.filter((_, idx) => idx !== i) }))}
              title="Eliminar imagen"
              style={{
                position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.55)", color: "#fff",
                border: "none", borderRadius: 14, width: 28, height: 28, cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    )}

    {/* Previews de VIDEO (cada uno) con reprocesado individual */}
    {attachments.videos?.length > 0 && (
      <div style={{ marginTop: 8, display: "grid", gap: 12 }}>
        {attachments.videos.map((u, i) => (
          <div key={i} style={{ position: "relative", border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
            <video controls src={u} style={{ width: "100%", borderRadius: 6 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setAttachments(a => ({ ...a, videos: a.videos.filter((_, j) => j !== i) }))}
                style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #d55", background: "#fff", color: "#d55", fontSize: 12 }}
              >
                Quitar ✕
              </button>
              <label style={{ fontSize: 12, color: "#555" }}>Reprocesar con:</label>
              <select
                value={videoPostFilter}
                onChange={(e) => setVideoPostFilter(e.target.value)}
                style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #bbb" }}
              >
                <option value="noir">Noir</option>
                <option value="warm">Warm</option>
                <option value="cool">Cool</option>
                <option value="comic">Comic</option>
              </select>
              <button
                type="button"
                onClick={() => reprocessVideoUrlWithFilter(u, videoPostFilter, i)}
                style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #bbb", background: "#fff", fontSize: 12 }}
              >
                Aplicar
              </button>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Audios adjuntos + reprocesado de la última grabación */}
    {attachments.audios?.length > 0 && (
      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
        {attachments.audios.map((u, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <audio controls src={u} style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => setAttachments((a) => ({ ...a, audios: a.audios.filter((_, j) => j !== i) }))}
              style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #bbb", background: "#fff", fontSize: 12 }}
              title="Quitar audio"
            >
              Quitar ✕
            </button>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: "#555" }}>Reprocesar última grabación con:</label>
          <select
            value={audioPostEffect}
            onChange={(e) => setAudioPostEffect(e.target.value)}
            style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #bbb" }}
          >
            <option value="deep">Deep</option>
            <option value="robot">Robot</option>
            <option value="chipmunk">Chipmunk</option>
            <option value="hall">Hall</option>
          </select>
          <button
            type="button"
            onClick={() => reprocessLastAudio(audioPostEffect)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #bbb", background: "#fff" }}
          >
            Aplicar
          </button>
        </div>
      </div>
    )}

    {/* Subtítulos para audios y videos */}
    {attachments.audios?.length > 0 && <SubtitlesComposer audios={attachments.audios} onToast={show} />}
    {attachments.videos?.length > 0 && <VideoSubtitlesComposer videos={attachments.videos} onToast={show} />}

    <EmojiBar onPick={(e) => setNewPost((t) => (t || "") + e)} />

    {/* Target pickers (canales) */}
    {renderTargetPickers()}
  </div>

  <button
    type="submit"
    disabled={
      posting ||
      isUploadingMedia ||
      (!newPost.trim() &&
        !attachments.images.length &&
        !attachments.videos?.length &&
        !attachments.audios?.length &&
        !recPreviewUrl)
    }
    style={{
      opacity: posting || isUploadingMedia ? 0.6 : 1,
      background: "#6b25d7",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "12px 20px",
      fontWeight: 600,
      cursor: posting || isUploadingMedia ? "not-allowed" : "pointer",
      height: 46,
    }}
  >
    {posting ? "Publicando…" : isUploadingMedia ? "Subiendo medios…" : "+ Crear post"}
  </button>
</form>
{/* Modal cámara fallback en desktop */}
{cameraOpen && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
    }}
  >
    <div style={{ background: "#fff", padding: 12, borderRadius: 10, width: 360, maxWidth: "90vw" }}>
      <video ref={videoRef} style={{ width: "100%", borderRadius: 8 }} playsInline muted />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={takePhotoFallback} style={{ flex: 1, padding: "8px 12px" }}>📸 Tomar foto</button>
        <button onClick={closeCameraFallback} style={{ flex: 1, padding: "8px 12px", background: "#eee" }}>Cancelar</button>
      </div>
    </div>
  </div>
)}

{/* Filtros y tendencias */}
<div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
  <div>
    <label style={{ fontSize: 13, color: "#555", marginRight: 6 }}>Ordenar por:</label>
    <select
      value={orderBy}
      onChange={(e) => setOrderBy(e.target.value)}
      style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #bbb" }}
      title="Orden del feed"
    >
      <option value="recent">Más recientes</option>
      <option value="top">Más votados</option>
      <option value="comments">Más comentados</option>
    </select>
  </div>

  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <label style={{ fontSize: 13, color: "#555" }}>#Tendencia:</label>
    <select
      value={activeTag || ""}
      onChange={(e) => setActiveTag(e.target.value || null)}
      style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #bbb" }}
    >
      <option value="">(todas)</option>
      {trends.map((t) => (
        <option key={t.tag} value={t.tag}>
          #{t.tag}
        </option>
      ))}
    </select>
  </div>
</div>

{/* Render de posts */}
{isLoading && <div>Cargando…</div>}
{error && <div style={{ color: "red" }}>{error}</div>}

{!isLoading &&
  posts.map((p) => (
    <div
      key={p.id}
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        background: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <b>{p.author}</b>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#777" }}>
          {new Date(p.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Texto sin URLs de media (evita "me postea una URL") */}
      <div style={{ whiteSpace: "pre-wrap", fontSize: 15 }}>
        {stripMediaUrlsFromText(p.text)}
      </div>

      {/* Medios */}
      {p.images?.length > 0 && (
        <MediaCarousel items={p.images} autoPlay intervalMs={carouselInterval} effect={carouselEffect} />
      )}
      {p.videos?.length > 0 && <VideoStack items={p.videos} autoChain={videoAutoChain} />}
      {p.audios?.map((u, i) => (
        <div key={i} style={{ marginTop: 6 }}>
          <audio controls src={u} style={{ width: "100%" }} />
        </div>
      ))}

      <MetricsBar data={metricsMap[p.id]} />

      <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
        <button onClick={() => reactPostOptimistic(p.id, "like")}>❤ {p.reactions?.like || 0}</button>
        <button onClick={() => reactPostOptimistic(p.id, "dislike")}>👎 {p.reactions?.dislike || 0}</button>
        <button onClick={() => reactPostOptimistic(p.id, "favorite")}>⭐ {p.reactions?.favorite || 0}</button>
        <button onClick={() => reactPostOptimistic(p.id, "not_interested")}>🚫 {p.reactions?.not_interested || 0}</button>
        <button onClick={() => deletePost(p.id)} style={{ marginLeft: "auto", color: "#c33" }}>
          🗑 Eliminar
        </button>
      </div>

      <div style={{ marginTop: 8 }}>
        {Object.entries(p.channelStates || {}).map(([ch, st]) => (
          <ChannelChip key={ch} state={st} />
        ))}
      </div>

      <CommentSection
        postId={p.id}
        postOwner={p.author}
        comments={p.comments || []}
        onAddCommentOptimistic={addCommentOptimistic}
        onReactCommentOptimistic={reactCommentOptimistic}
        currentUser={currentUser}
        showToast={show}
      />
    </div>
  ))}

{nextCursor && (
  <div ref={sentinelRef} style={{ textAlign: "center", padding: 20 }}>
    {isLoadingMore ? "Cargando más…" : "↓ Desplázate para ver más"}
  </div>
)}
</main>
);
}
