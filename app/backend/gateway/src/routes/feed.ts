/**
 * AMIGO :: rutas feed (/v1/*) — CRUD + comentarios + likes + emojis (single-choice) + media + paginación + /v1/files
 */
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  type Item, type Comment, type ReactionType, type Media,
  getAll, getById, addItem, updateItem, removeItem,
  addComment, updateComment, removeComment,
  toggleItemLike, toggleCommentLike,
  toggleItemEmoji, toggleCommentEmoji,
  paginate
} from '../store/feedStore.js';

const EMOJIS: ReactionType[] = ['❤','👎','👍','😂','🎉','😢','😡'];
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

function projectItem(it: Item, meId?: string) {
  const reactionsCount = it.reactions.length;
  const likedByMe      = !!(meId && it.reactions.includes(meId));
  const emojiCounts: Record<string, number> = Object.fromEntries(EMOJIS.map(e => [e, 0]));
  for (const r of it.emojiReactions ?? []) emojiCounts[r.type] = (emojiCounts[r.type] || 0) + 1;
  const myReaction = meId ? (it.emojiReactions ?? []).find(r => r.userId === meId)?.type ?? null : null;
  return { ...it, reactionsCount, likedByMe, emojiCounts, myReaction };
}

function projectComment(c: Comment, meId?: string) {
  const reactionsCount = c.reactions.length;
  const likedByMe      = !!(meId && c.reactions.includes(meId));
  const emojiCounts: Record<string, number> = Object.fromEntries(EMOJIS.map(e => [e, 0]));
  for (const r of c.emojiReactions ?? []) emojiCounts[r.type] = (emojiCounts[r.type] || 0) + 1;
  const myReaction = meId ? (c.emojiReactions ?? []).find(r => r.userId === meId)?.type ?? null : null;
  return { ...c, reactionsCount, likedByMe, emojiCounts, myReaction };
}

// ---- helpers archivos ----
function guessContentType(ext: string) {
  const e = ext.toLowerCase();
  if (e === 'png') return 'image/png';
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'webp') return 'image/webp';
  if (e === 'gif') return 'image/gif';
  if (e === 'mp4') return 'video/mp4';
  if (e === 'webm') return 'video/webm';
  if (e === 'mp3') return 'audio/mpeg';
  if (e === 'wav') return 'audio/wav';
  if (e === 'ogg') return 'audio/ogg';
  return 'application/octet-stream';
}

export default async function feedRoutes(app: FastifyInstance) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  // ===== Archivos (dataURL -> disco) =====
  app.post<{ Body: { dataUrl?: string; ext?: string } }>('/files', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });
    const dataUrl = req.body?.dataUrl;
    if (!dataUrl || !dataUrl.startsWith('data:')) return reply.code(400).send({ message: 'dataUrl inválido' });

    const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
    if (!m) return reply.code(400).send({ message: 'dataUrl inválido' });
    const mime = m[1];
    const base64 = m[2];
    const buf = Buffer.from(base64, 'base64');

    const safeExt = (req.body?.ext || (mime.split('/')[1] || 'bin')).replace(/[^a-z0-9]/gi,'').toLowerCase();
    const name = `${Date.now()}_${randomUUID()}.${safeExt}`;
    const filePath = path.join(UPLOAD_DIR, name);
    await fs.writeFile(filePath, buf);

    // URL ABSOLUTO (para que <img src="..."> no apunte al 3001)
    const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
    const host  = (req.headers.host as string) || '127.0.0.1:8080';
    const base  = `${proto}://${host}`;
    return { ok: true, url: `${base}/v1/files/${encodeURIComponent(name)}` };
  });

  app.get<{ Params: { name: string } }>('/files/:name', async (req, reply) => {
    const filePath = path.join(UPLOAD_DIR, path.basename(req.params.name));
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) return reply.code(404).send();
      const ext = (req.params.name.split('.').pop() || 'bin');
      reply.header('Content-Type', guessContentType(ext));
      const stream = (await import('node:fs')).createReadStream(filePath);
      return reply.send(stream);
    } catch {
      return reply.code(404).send();
    }
  });

  // ===== Items =====
  app.get('/feed', async (req) => {
    const q = (req.query as any) || {};
    const limit  = Number(q.limit ?? 10);
    const cursor = q.cursor as string | undefined;

    const page = paginate(await getAll(), Math.max(1, Math.min(limit, 50)), cursor);
    const meId = (req as any).user?.id as string | undefined;

    const items = page.items.map(it => projectItem(it, meId));
    return { ok: true, items, nextCursor: page.nextCursor };
  });

  app.post<{ Body: { text?: string; media?: Media } }>('/feed', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });
    const text = (req.body?.text ?? '').trim();
    const media = req.body?.media ?? {};
    if (!text && (!media.images?.length && !media.videos?.length && !media.audios?.length)) {
      return reply.code(400).send({ message: 'texto o media requerido' });
    }
    if (text && text.length > 500) return reply.code(400).send({ message: 'muy largo' });

    const item: Item = {
      id: randomUUID(),
      text,
      createdAt: new Date().toISOString(),
      author: { id: req.user.id, name: req.user.name },
      comments: [],
      reactions: [],
      emojiReactions: [],
      media,
    };
    await addItem(item);
    return { ok: true, item: projectItem(item, req.user.id) };
  });

  app.put<{ Params: { id: string }, Body: { text?: string } }>('/feed/:id', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });

    const it = await getById(req.params.id);
    if (!it) return reply.code(404).send({ message: 'no existe' });

    if (it.author?.id && it.author.id !== req.user.id) return reply.code(403).send({ message: 'forbidden' });

    const text = (req.body?.text ?? '').trim();
    if (!text) return reply.code(400).send({ message: 'texto vacío' });

    const updated = await updateItem(it.id, { text });
    return { ok: true, item: projectItem(updated!, req.user.id) };
  });

  app.delete<{ Params: { id: string } }>('/feed/:id', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });

    const it = await getById(req.params.id);
    if (!it) return reply.code(404).send({ message: 'no existe' });

    if (it.author?.id && it.author.id !== req.user.id) return reply.code(403).send({ message: 'forbidden' });

    await removeItem(it.id);
    return { ok: true };
  });

  // Like clásico (compat)
  app.post<{ Params: { id: string } }>('/feed/:id/like', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });
    try {
      const it = await toggleItemLike(req.params.id, req.user.id);
      return { ok: true, item: projectItem(it, req.user.id) };
    } catch (e:any) {
      return reply.code(404).send({ message: e?.message || 'no existe' });
    }
  });

  // Reacciones por emoji (single-choice)
  app.post<{ Params: { id: string }, Body: { type?: ReactionType } }>(
    '/feed/:id/react',
    async (req, reply) => {
      if (!req.user) return reply.code(401).send({ message: 'login requerido' });
      const type = (req.body?.type ?? '❤') as ReactionType;
      if (!EMOJIS.includes(type)) return reply.code(400).send({ message: 'tipo inválido' });
      try {
        const it = await toggleItemEmoji(req.params.id, req.user.id, type);
        return { ok: true, item: projectItem(it, req.user.id) };
      } catch (e:any) {
        return reply.code(404).send({ message: e?.message || 'no existe' });
      }
    }
  );

  // ===== Comentarios =====
  app.get<{ Params: { id: string } }>('/feed/:id/comments', async (req, reply) => {
    const it = await getById(req.params.id);
    if (!it) return reply.code(404).send({ message: 'item no existe' });

    const q = (req.query as any) || {};
    const limit  = Number(q.limit ?? 10);
    const cursor = q.cursor as string | undefined;

    const page = paginate(it.comments, Math.max(1, Math.min(limit, 50)), cursor);
    const meId = (req as any).user?.id as string | undefined;

    const comments = page.items.map(c => projectComment(c, meId));
    return { ok: true, comments, nextCursor: page.nextCursor };
  });

  app.post<{ Params: { id: string }, Body: { text?: string; media?: Media } }>('/feed/:id/comments', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });

    const it = await getById(req.params.id);
    if (!it) return reply.code(404).send({ message: 'item no existe' });

    const text = (req.body?.text ?? '').trim();
    const media = req.body?.media ?? {};
    if (!text && (!media.images?.length && !media.videos?.length && !media.audios?.length)) {
      return reply.code(400).send({ message: 'texto o media requerido' });
    }
    if (text && text.length > 300) return reply.code(400).send({ message: 'muy largo' });

    const c: Comment = {
      id: randomUUID(),
      text,
      createdAt: new Date().toISOString(),
      author: { id: req.user.id, name: req.user.name },
      reactions: [],
      emojiReactions: [],
      media,
    };
    await addComment(it.id, c);
    return { ok: true, comment: projectComment(c, req.user.id) };
  });

  app.put<{ Params: { id: string, cid: string }, Body: { text?: string } }>(
    '/feed/:id/comments/:cid',
    async (req, reply) => {
      if (!req.user) return reply.code(401).send({ message: 'login requerido' });

      const it = await getById(req.params.id);
      if (!it) return reply.code(404).send({ message: 'item no existe' });

      const c = it.comments.find(x => x.id === req.params.cid);
      if (!c) return reply.code(404).send({ message: 'comentario no existe' });

      if (c.author?.id && c.author.id !== req.user.id) return reply.code(403).send({ message: 'forbidden' });

      const text = (req.body?.text ?? '').trim();
      if (!text) return reply.code(400).send({ message: 'texto vacío' });

      const up = await updateComment(it.id, c.id, text);
      return { ok: true, comment: projectComment(up!, req.user.id) };
    }
  );

  app.delete<{ Params: { id: string, cid: string } }>(
    '/feed/:id/comments/:cid',
    async (req, reply) => {
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

  // Like clásico en comentario (compat)
  app.post<{ Params: { id: string, cid: string } }>(
    '/feed/:id/comments/:cid/like',
    async (req, reply) => {
      if (!req.user) return reply.code(401).send({ message: 'login requerido' });
      try {
        const c = await toggleCommentLike(req.params.id, req.params.cid, req.user.id);
        return { ok: true, comment: projectComment(c, req.user.id) };
      } catch (e:any) {
        return reply.code(404).send({ message: e?.message || 'no existe' });
      }
    }
  );

  // Reacciones por emoji en comentario (single-choice)
  app.post<{ Params: { id: string, cid: string }, Body: { type?: ReactionType } }>(
    '/feed/:id/comments/:cid/react',
    async (req, reply) => {
      if (!req.user) return reply.code(401).send({ message: 'login requerido' });
      const type = (req.body?.type ?? '❤') as ReactionType;
      if (!EMOJIS.includes(type)) return reply.code(400).send({ message: 'tipo inválido' });
      try {
        const c = await toggleCommentEmoji(req.params.id, req.params.cid, req.user.id, type);
        return { ok: true, comment: projectComment(c, req.user.id) };
      } catch (e:any) {
        return reply.code(404).send({ message: e?.message || 'no existe' });
      }
    }
  );
}
