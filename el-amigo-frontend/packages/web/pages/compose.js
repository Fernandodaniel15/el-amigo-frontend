import { useEffect, useRef, useState } from "react";

// Pantalla simple para crear posts con imágenes (drag&drop) y audio (grabar)
export default function Compose() {
  const [text, setText] = useState("");
  const [images, setImages] = useState([]);        // dataURLs
  const [audioUrl, setAudioUrl] = useState(null);  // dataURL
  const [busy, setBusy] = useState(false);

  // --- Drag & Drop imágenes ---
  const onDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    files.forEach(file => {
      const r = new FileReader();
      r.onload = () => setImages(prev => [...prev, r.result]);
      r.readAsDataURL(file);
    });
  };
  const onPick = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
    files.forEach(file => {
      const r = new FileReader();
      r.onload = () => setImages(prev => [...prev, r.result]);
      r.readAsDataURL(file);
    });
    e.target.value = "";
  };

  // --- Grabar audio (MediaRecorder) ---
  const mediaRef = useRef({ recorder: null, chunks: [] });
  const [recState, setRecState] = useState("idle"); // idle | recording | done

  const startRec = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Tu navegador no soporta grabación de audio.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mediaRef.current.chunks = [];
    mr.ondataavailable = (ev) => { if (ev.data.size) mediaRef.current.chunks.push(ev.data); };
    mr.onstop = () => {
      const blob = new Blob(mediaRef.current.chunks, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onload = () => setAudioUrl(reader.result); // dataURL
      reader.readAsDataURL(blob);
      setRecState("done");
      stream.getTracks().forEach(t => t.stop());
    };
    mr.start();
    mediaRef.current.recorder = mr;
    setRecState("recording");
  };
  const stopRec = () => {
    mediaRef.current.recorder?.stop();
  };
  const resetAudio = () => {
    setAudioUrl(null);
    setRecState("idle");
  };

  // --- Enviar post ---
  const submit = async () => {
    const clean = String(text || "").trim();
    if (!clean) { alert("Escribe algo para publicar."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/social/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "usuario" },
        body: JSON.stringify({ text: clean, images, audioUrl }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Error al publicar");
      // Reset
      setText(""); setImages([]); setAudioUrl(null); setRecState("idle");
      alert("Publicado.");
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "30px auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 12 }}>Crear publicación</h1>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="¿Qué querés contar?"
        rows={4}
        style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
      />

      {/* Imágenes */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          marginTop: 12, padding: 16, border: "2px dashed #aaa", borderRadius: 12,
          textAlign: "center"
        }}
      >
        <div>Arrastrá imágenes aquí o</div>
        <label style={{ display: "inline-block", marginTop: 8, cursor: "pointer", color: "#0b5" }}>
          seleccionar…
          <input type="file" accept="image/*" multiple onChange={onPick} style={{ display: "none" }} />
        </label>
      </div>

      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginTop: 12 }}>
          {images.map((src, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={src} alt={`img-${i}`} style={{ width: "100%", borderRadius: 8, display: "block" }} />
              <button
                onClick={() => setImages(prev => prev.filter((_, k) => k !== i))}
                style={{ position: "absolute", top: 6, right: 6, background: "#0008", color: "#fff", border: 0, borderRadius: 6, padding: "2px 6px" }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Audio */}
      <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#f7f7f7" }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>Audio</div>
        {recState === "idle" && (
          <button onClick={startRec} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #0b5", color: "#0b5", background: "#fff" }}>
            Grabar
          </button>
        )}
        {recState === "recording" && (
          <button onClick={stopRec} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d33", color: "#d33", background: "#fff" }}>
            Parar
          </button>
        )}
        {audioUrl && recState === "done" && (
          <div>
            <audio controls src={audioUrl} style={{ width: "100%", marginTop: 8 }} />
            <div>
              <button onClick={resetAudio} style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, border: "1px solid #aaa", background: "#fff" }}>
                Quitar audio
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          disabled={busy}
          onClick={submit}
          style={{ padding: "10px 16px", borderRadius: 10, border: 0, background: "#0b5", color: "#fff", fontWeight: 600 }}
        >
          {busy ? "Publicando…" : "Publicar"}
        </button>
        <a href="/feed" style={{ marginLeft: 12, color: "#06c" }}>Ir al feed</a>
      </div>
    </div>
  );
}
