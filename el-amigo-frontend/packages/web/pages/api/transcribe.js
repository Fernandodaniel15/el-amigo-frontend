// /pages/api/transcribe.js
import OpenAI from "openai";

/**
 * Aumentamos el límite del body (audios grandes).
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
  },
};

/** data:<mime>;base64,<payload> -> { mime, buf } */
function parseDataUrl(str = "") {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(String(str));
  if (!m) return null;
  const [, mime, b64] = m;
  try {
    return { mime, buf: Buffer.from(b64, "base64") };
  } catch {
    return null;
  }
}

/** Mapea un mime a extensión amigable (ayuda a Whisper). */
function extFromMime(m = "audio/webm") {
  const t = String(m).toLowerCase();
  if (t.includes("mp3") || t.includes("mpeg")) return "mp3";
  if (t.includes("m4a") || t.includes("mp4")) return "m4a";
  if (t.includes("wav")) return "wav";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("webm")) return "webm";
  return "webm";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).end("Method Not Allowed");
    }

    const { audioData, type } = req.body || {};
    if (!audioData) {
      return res.status(400).json({ message: "Falta audioData (dataURL)" });
    }

    const parsed = parseDataUrl(audioData);
    if (!parsed) {
      return res.status(400).json({ message: "dataURL inválido" });
    }

    const API_KEY = process.env.OPENAI_API_KEY || "";

    // Modo demo si NO hay API key
    if (!API_KEY) {
      return res.status(200).json({
        text:
          "Demo: audio recibido correctamente, pero falta OPENAI_API_KEY en el servidor.",
      });
    }

    // Con API key -> Whisper real
    const client = new OpenAI({ apiKey: API_KEY });
    const mime = type || parsed.mime || "audio/webm";
    const filename = `audio.${extFromMime(mime)}`;

    // Helper de SDK v4 para Node
    const file = await OpenAI.toFile(parsed.buf, filename, { type: mime });

    const resp = await client.audio.transcriptions.create({
      model: "whisper-1",
      file,
      // language: "es", // opcional
    });

    const text = resp?.text ?? "";
    return res.status(200).json({ text });
  } catch (err) {
    // Fallback amistoso: nunca rompemos la UI
    const status = err?.status || err?.code || "";
    const msg = err?.message || String(err);
    console.error("OPENAI TRANSCRIBE ERROR:", status, msg);
    if (err?.response?.data) {
      console.error("OPENAI RESP BODY:", err.response.data);
    }
    return res.status(200).json({
      text:
        "Demo: audio recibido. No se pudo usar Whisper en el servidor (" +
        (status || "error") +
        ").",
    });
  }
}
