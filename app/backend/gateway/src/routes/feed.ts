/**
 * AMIGO :: rutas feed (/v1/*) — CRUD + comentarios + reacciones + paginación + media + /v1/files
 */
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import {
  type Item, type Comment, type ReactionType, type Media,
  getAll, getById, addItem, updateItem, removeItem,
  addComment, updateComment, removeComment,
  toggleItemReaction, toggleCommentReaction, paginate
} from '../store/feedStore.js';
import { promises as fs } from 'node:fs';
import { createReadStream } from 'node:fs';
import path from 'node:path';

const REACTIONS: ReactionType[] = ['❤','👎','👍','😂','🎉','😢','😡'];

/** Carpeta de subidas (conservamos tu estructura data/uploads) */
const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploads');
async function ensureUploads() { try { await fs.mkdir(UPLOAD_DIR, { recursive: true }); } catch {} }

/** Whitelist de extensiones (incluye mov/m4a para iOS/Safari) */
const ALLOWED_EXT = new Set(['png','jpg','jpeg','webp','gif','mp4','webm','mp3','wav','ogg','m4a','mov']);

function guessContentType(ext: string) {
  const e = ext.toLowerCase();
  if (e === 'png') return 'image/png';
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'webp') return 'image/webp';
  if (e === 'gif') return 'image/gif';
  if (e === 'mp4') return 'video/mp4';
  if (e === 'webm') return 'video/webm';
  if (e === 'mov') return 'video/quicktime';
  if (e === 'mp3') return 'audio/mpeg';
  if (e === 'wav') return 'audio/wav';
  if (e === 'ogg') return 'audio/ogg';
  if (e === 'm4a') return 'audio/mp4';
  return 'application/octet-stream';
}

/** proyección: cuenta de emojis + mi selección (single-choice) */
function projectReactions<T extends { reactions?: { userId:string; type:ReactionType }[] }>(obj: T, meId?: string) {
  const counts: Record<string, number> = Object.fromEntries(REACTIONS.map(r => [r, 0]));
  for (const r of (obj.reactions || [])) if (counts[r.type] != null) counts[r.type]++;
  const mySet = new Set<string>();
  if (meId) for (const r of (obj.reactions || [])) if (r.userId === meId) mySet.add(r.type);
  const myReaction = [...mySet].pop() || null;
  return { ...obj, emojiCounts: counts, myReaction };
}

export default async function feedRoutes(app: FastifyInstance) {
  // ------------------ Subidas de archivos (dataURL) ------------------
  app.post<{ Body: { dataUrl?: string; ext?: string } }>(
    '/files',
    { config: { bodyLimit: 50 * 1024 * 1024 } }, // 50 MB
    async (req, reply) => {
      // 👉 Mantengo tu auth. Para desarrollo podés permitir anónimos seteando ALLOW_ANON_UPLOADS=1
      if (!req.user && process.env.ALLOW_ANON_UPLOADS !== '1') {
        return reply.code(401).send({ message: 'login requerido' });
      }

      const dataUrl = String(req.body?.dataUrl || '');
      if (!dataUrl.startsWith('data:')) return reply.code(400).send({ message: 'dataUrl inválida' });

      const [meta, base64] = dataUrl.split(',', 2);
      if (!base64) return reply.code(400).send({ message: 'dataUrl corrupta' });

      let extFromMeta = '';
      if (/image\/png/i.test(meta)) extFromMeta = 'png';
      else if (/image\/jpeg/i.test(meta)) extFromMeta = 'jpg';
      else if (/image\/webp/i.test(meta)) extFromMeta = 'webp';
      else if (/image\/gif/i.test(meta)) extFromMeta = 'gif';
      else if (/video\/webm/i.test(meta)) extFromMeta = 'webm';
      else if (/video\/mp4/i.test(meta))  extFromMeta = 'mp4';
      else if (/video\/quicktime/i.test(meta)) extFromMeta = 'mov';
      else if (/audio\/webm/i.test(meta)) extFromMeta = 'webm';
      else if (/audio\/ogg/i.test(meta))  extFromMeta = 'ogg';
      else if (/audio\/mpeg/i.test(meta)) extFromMeta = 'mp3';
      else if (/audio\/mp4/i.test(meta))  extFromMeta = 'm4a';
      else if (/audio\/wav/i.test(meta))  extFromMeta = 'wav';

      const ext = (req.body?.ext || extFromMeta || 'bin').replace(/[^a-z0-9]/gi,'').toLowerCase();
      if (!ALLOWED_EXT.has(ext)) return reply.code(400).send({ message: 'extensión no permitida' });

      const buf = Buffer.from(base64, 'base64');
      if (buf.byteLength > 50 * 1024 * 1024) return reply.code(413).send({ message: 'archivo demasiado grande' });

      await ensureUploads();
      const name = `${Date.now()}_${randomUUID()}.${ext}`;
      const filePath = path.join(UPLOAD_DIR, name);
      await fs.writeFile(filePath, buf);

      return { ok: true, url: `/v1/files/${encodeURIComponent(name)}` };
    }
  );

  // Static file serving con Range + cache
  app.get<{ Params: { name: string } }>('/files/:name', async (req, reply) => {
    const name = path.basename(req.params.name).slice(0, 160);
    const filePath = path.join(UPLOAD_DIR, name);
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) return reply.code(404).send();

      const total = stat.size;
      const ext = (name.split('.').pop() || 'bin').toLowerCase();
      const ct  = guessContentType(ext);

      const etag = `"${stat.size}-${stat.mtimeMs}"`;
      reply.header('ETag', etag);
      reply.header('Last-Modified', stat.mtime.toUTCString());
      reply.header('Accept-Ranges', 'bytes');
      reply.header('Content-Type', ct);
      reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
      reply.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');

      // If-None-Match
      if (req.headers['if-none-match'] === etag) return reply.code(304).send();

      const range = (req.headers.range as string | undefined);
      if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
        const start = parseInt(startStr, 10);
        const end   = endStr ? parseInt(endStr, 10) : total - 1;
        const chunk = (end - start) + 1;
        reply
          .code(206)
          .header('Content-Range', `bytes ${start}-${end}/${total}`)
          .header('Content-Length', chunk);
        return reply.send(createReadStream(filePath, { start, end }));
      } else {
        reply.header('Content-Length', total);
        reply.header('Cache-Control', 'public, max-age=31536000, immutable');
        return reply.send(createReadStream(filePath));
      }
    } catch {
      return reply.code(404).send();
    }
  });

  // ------------------------------- Items ------------------------------------
  app.get('/feed', async (req) => {
    const q = req.query as any;
    const limit  = Math.max(1, Math.min(Number(q?.limit ?? 10), 50));
    const cursor = q?.cursor as string | undefined;

    const page = paginate(await getAll(), limit, cursor);
    const me   = (req as any).user?.id as string | undefined;

    const items = page.items.map(it => projectReactions(it, me));
    return { ok: true, items, nextCursor: page.nextCursor };
  });

  app.post<{ Body: { text?: string; media?: Media } }>('/feed', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });
    const text  = (req.body?.text ?? '').trim();
    const media = req.body?.media || undefined;
    if (!text && !media) return reply.code(400).send({ message: 'post vacío' });
    if (text.length > 2000) return reply.code(400).send({ message: 'muy largo' });

    const item: Item = {
      id: randomUUID(),
      text,
      createdAt: new Date().toISOString(),
      author: { id: req.user.id, name: req.user.name },
      comments: [],
      reactions: [],
      media,
    };
    await addItem(item);
    return { ok: true, item: projectReactions(item, req.user.id) };
  });

  app.put<{ Params: { id: string }, Body: { text?: string } }>('/feed/:id', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });

    const it = await getById(req.params.id);
    if (!it) return reply.code(404).send({ message: 'no existe' });
    if (it.author?.id && it.author.id !== req.user.id) return reply.code(403).send({ message: 'forbidden' });

    const text = (req.body?.text ?? '').trim();
    if (!text) return reply.code(400).send({ message: 'texto vacío' });

    const updated = await updateItem(it.id, { text });
    return { ok: true, item: projectReactions(updated!, req.user.id) };
  });

  app.delete<{ Params: { id: string } }>('/feed/:id', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });
    const it = await getById(req.params.id);
    if (!it) return reply.code(404).send({ message: 'no existe' });
    if (it.author?.id && it.author.id !== req.user.id) return reply.code(403).send({ message: 'forbidden' });

    await removeItem(it.id);
    return { ok: true };
  });

  // Reacciones de item (emoji)
  app.post<{ Params: { id: string }, Body: { type?: ReactionType } }>(
    '/feed/:id/react', async (req, reply) => {
      if (!req.user) return reply.code(401).send({ message: 'login requerido' });
      const type = (req.body?.type ?? '❤') as ReactionType;
      if (!REACTIONS.includes(type)) return reply.code(400).send({ message: 'tipo inválido' });
      try {
        const it = await toggleItemReaction(req.params.id, req.user.id, type);
        return { ok: true, item: projectReactions(it, req.user.id) };
      } catch (e:any) {
        return reply.code(404).send({ message: e?.message || 'no existe' });
      }
    }
  );

  // Compat like => ❤
  app.post<{ Params: { id: string } }>('/feed/:id/like', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });
    try {
      const it = await toggleItemReaction(req.params.id, req.user.id, '❤');
      return { ok: true, item: projectReactions(it, req.user.id) };
    } catch (e:any) {
      return reply.code(404).send({ message: e?.message || 'no existe' });
    }
  });

  // ---------------------------- Comentarios ---------------------------------
  app.get<{ Params: { id: string } }>('/feed/:id/comments', async (req, reply) => {
    const it = await getById(req.params.id);
    if (!it) return reply.code(404).send({ message: 'item no existe' });

    const q = req.query as any;
    const limit  = Math.max(1, Math.min(Number(q?.limit ?? 10), 50));
    const cursor = q?.cursor as string | undefined;

    const page = paginate(it.comments, limit, cursor);
    const me   = (req as any).user?.id as string | undefined;
    const comments = page.items.map(c => projectReactions(c, me));
    return { ok: true, comments, nextCursor: page.nextCursor };
  });

  app.post<{ Params: { id: string }, Body: { text?: string; media?: Media } }>(
    '/feed/:id/comments', async (req, reply) => {
      if (!req.user) return reply.code(401).send({ message: 'login requerido' });

      const it = await getById(req.params.id);
      if (!it) return reply.code(404).send({ message: 'item no existe' });

      const text  = (req.body?.text ?? '').trim();
      const media = req.body?.media || undefined;
      if (!text && !media) return reply.code(400).send({ message: 'comentario vacío' });
      if (text.length > 3000) return reply.code(400).send({ message: 'muy largo' });

      const c: Comment = {
        id: randomUUID(),
        text,
        createdAt: new Date().toISOString(),
        author: { id: req.user.id, name: req.user.name },
        reactions: [],
        media,
      };
      await addComment(it.id, c);
      return { ok: true, comment: projectReactions(c, req.user.id) };
    }
  );

  app.put<{ Params: { id: string, cid: string }, Body: { text?: string } }>(
    '/feed/:id/comments/:cid', async (req, reply) => {
      if (!req.user) return reply.code(401).send({ message: 'login requerido' });
      const it = await getById(req.params.id);
      if (!it) return reply.code(404).send({ message: 'item no existe' });

      const c = it.comments.find(x => x.id === req.params.cid);
      if (!c) return reply.code(404).send({ message: 'comentario no existe' });
      if (c.author?.id && c.author.id !== req.user.id) return reply.code(403).send({ message: 'forbidden' });

      const text = (req.body?.text ?? '').trim();
      if (!text) return reply.code(400).send({ message: 'texto vacío' });

      const up = await updateComment(it.id, c.id, text);
      return { ok: true, comment: projectReactions(up!, req.user.id) };
    }
  );

  app.delete<{ Params: { id: string, cid: string } }>(
    '/feed/:id/comments/:cid', async (req, reply) => {
      if (!req.user) return reply.code(401).send({ message: 'login requerido' });
      const it = await getById(req.params.id);
      if (!it) return reply.code(404).send({ message: 'item no existe' });

      const c = it.comments.find(x => x.id === req.params.cid);
      if (!c) return reply.code(404).send({ message: 'comentario no existe' });
      if (c.author?.id && c.author.id !== req.user.id) return reply.code(403).send({ message: 'forbidden' });

      await removeComment(it.id, c.id);
      return { ok: true };
    }
  );

  // Reacciones de comentario (emoji)
  app.post<{ Params: { id: string, cid: string }, Body: { type?: ReactionType } }>(
    '/feed/:id/comments/:cid/react', async (req, reply) => {
      if (!req.user) return reply.code(401).send({ message: 'login requerido' });
      const type = (req.body?.type ?? '❤') as ReactionType;
      if (!REACTIONS.includes(type)) return reply.code(400).send({ message: 'tipo inválido' });

      try {
        const c = await toggleCommentReaction(req.params.id, req.params.cid, req.user.id, type);
        return { ok: true, comment: projectReactions(c, req.user.id) };
      } catch (e:any) {
        return reply.code(404).send({ message: e?.message || 'no existe' });
      }
    }
  );
}
