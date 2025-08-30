// /pages/api/upload.js
import path from "path";
import { promises as fs } from "fs";
import formidable from "formidable";

// Importante: desactivamos el bodyParser para poder manejar multipart Y JSON manualmente.
export const config = { api: { bodyParser: false } };

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

function ensureExt(type = "", fallback = "bin") {
  const t = String(type).toLowerCase();
  if (t.includes("webm")) return "webm";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("mp4") || t.includes("mpeg4")) return "mp4";
  if (t.includes("quicktime")) return "mov";
  if (t.includes("wav")) return "wav";
  if (t.includes("aac")) return "aac";
  if (t.includes("x-m4a") || t.includes("audio/mp4")) return "m4a";
  if (t.includes("mp3") || t.includes("mpeg")) return "mp3";
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  if (t.includes("png")) return "png";
  if (t.includes("gif")) return "gif";
  if (t.includes("webp")) return "webp";
  return fallback;
}

async function saveBuffer(buf, { base = "file", ext = "bin", subdir = "" } = {}) {
  const day = new Date();
  const dir = path.join(
    UPLOAD_ROOT,
    String(day.getFullYear()),
    String(day.getMonth() + 1).padStart(2, "0"),
    String(day.getDate()).padStart(2, "0"),
    subdir || ""
  );
  await fs.mkdir(dir, { recursive: true });
  const name = `${base}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const p = path.join(dir, name);
  await fs.writeFile(p, buf);
  // URL pública
  const rel = p.split(path.join(process.cwd(), "public"))[1].replace(/\\/g, "/");
  return rel.startsWith("/") ? rel : `/${rel}`;
}

function readAll(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseDataUrl(str = "") {
  // data:<mime>;base64,<payload>
  const m = /^data:([^;]+);base64,(.+)$/i.exec(str);
  if (!m) return null;
  const [, mime, b64] = m;
  return { mime, buf: Buffer.from(b64, "base64") };
}

export default async function handler(req, res) {
  try {
    const ct = String(req.headers["content-type"] || "");

    // 1) multipart/form-data (recomendado para archivos grandes)
    if (ct.includes("multipart/form-data")) {
      const form = formidable({
        multiples: false,
        maxFileSize: 200 * 1024 * 1024, // 200 MB
      });

      const { fields, files } = await new Promise((resolve, reject) => {
        form.parse(req, (err, flds, fls) => (err ? reject(err) : resolve({ fields: flds, files: fls })));
      });

      const f = files.file; // nombre del campo que enviamos desde el cliente
      if (!f) return res.status(400).json({ message: "No file" });

      const filePath = Array.isArray(f) ? f[0].filepath : f.filepath;
      const origType = Array.isArray(f) ? f[0].mimetype : f.mimetype;
      const buf = await fs.readFile(filePath);
      const ext = ensureExt(origType, "bin");
      const base = (fields.name?.toString().replace(/\.[^.]+$/, "") || "file");
      const url = await saveBuffer(buf, { base, ext });

      // hook: efecto audio/video si quisieras procesar en servidor (ffmpeg) usando fields.effect

      return res.status(200).json({ url });
    }

    // 2) JSON con dataURL { name, type, data, effect }
    const raw = await readAll(req);
    let payload = {};
    try { payload = JSON.parse(raw.toString("utf8") || "{}"); } catch {
      return res.status(400).json({ message: "Invalid JSON" });
    }
    const { name = "file.bin", type = "application/octet-stream", data, effect = "none" } = payload || {};
    if (!data) return res.status(400).json({ message: "Missing data" });

    const parsed = parseDataUrl(String(data));
    if (!parsed) return res.status(400).json({ message: "Invalid data URL" });

    const ext = ensureExt(type || parsed.mime, "bin");
    const base = String(name).replace(/\.[^.]+$/, "") || "file";
    const url = await saveBuffer(parsed.buf, { base, ext });

    // hook: aplicar efecto si corresponde (server-side)
    // effect === 'robot' | 'deep' | 'chipmunk' | 'hall' ...

    return res.status(200).json({ url });
  } catch (err) {
    console.error("UPLOAD ERR:", err);
    return res.status(500).json({ message: "Upload failed", error: String(err?.message || err) });
  }
}
