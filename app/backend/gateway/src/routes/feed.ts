/**
 * AMIGO :: rutas feed (/v1/*) — CRUD + comentarios + likes + paginación
 */
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import {
  type Item, type Comment,
  getAll, getById, addItem, updateItem, removeItem,
  addComment, updateComment, removeComment,
  toggleItemLike, toggleCommentLike, paginate
} from '../store/feedStore.js';

export default async function feedRoutes(app: FastifyInstance) {
  // ===== Items =====
  app.get('/feed', async (req) => {
    const q = (req.query as any) || {};
    const limit = Number(q.limit ?? 10);
    const cursor = q.cursor as string | undefined;

    const page = paginate(await getAll(), Math.max(1, Math.min(limit, 50)), cursor);

    // enriquecemos con contadores y flag likedByMe si hay user
    const me = (req as any).user as { id: string; name: string } | undefined;
    const items = page.items.map((it) => ({
      ...it,
      reactionsCount: it.reactions.length,
      likedByMe: !!(me && it.reactions.includes(me.id)),
    }));

    return { ok: true, items, nextCursor: page.nextCursor };
  });

  app.post<{ Body: { text?: string } }>('/feed', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });
    const text = (req.body?.text ?? '').trim();
    if (!text) return reply.code(400).send({ message: 'texto vacío' });
    if (text.length > 500) return reply.code(400).send({ message: 'muy largo' });

    const item: Item = {
      id: randomUUID(),
      text,
      createdAt: new Date().toISOString(),
      author: { id: req.user.id, name: req.user.name },
      comments: [],
      reactions: [],
    };
    await addItem(item);
    return { ok: true, item };
  });

  app.put<{ Params: { id: string }, Body: { text?: string } }>('/feed/:id', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });

    const it = await getById(req.params.id);
    if (!it) return reply.code(404).send({ message: 'no existe' });
    if (it.author?.id && it.author.id !== req.user.id) return reply.code(403).send({ message: 'forbidden' });

    const text = (req.body?.text ?? '').trim();
    if (!text) return reply.code(400).send({ message: 'texto vacío' });

    const updated = await updateItem(it.id, { text });
    return { ok: true, item: updated };
  });

  app.delete<{ Params: { id: string } }>('/feed/:id', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });

    const it = await getById(req.params.id);
    if (!it) return reply.code(404).send({ message: 'no existe' });
    if (it.author?.id && it.author.id !== req.user.id) return reply.code(403).send({ message: 'forbidden' });

    await removeItem(it.id);
    return { ok: true };
  });

  // Reacciones de item
  app.post<{ Params: { id: string } }>('/feed/:id/like', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });
    try {
      const it = await toggleItemLike(req.params.id, req.user.id);
      const body = {
        ...it,
        reactionsCount: it.reactions.length,
        likedByMe: it.reactions.includes(req.user.id),
      };
      return { ok: true, item: body };
    } catch (e:any) {
      return reply.code(404).send({ message: e?.message || 'no existe' });
    }
  });

  // ===== Comentarios =====
  app.get<{ Params: { id: string } }>('/feed/:id/comments', async (req, reply) => {
    const it = await getById(req.params.id);
    if (!it) return reply.code(404).send({ message: 'item no existe' });

    const q = (req.query as any) || {};
    const limit = Number(q.limit ?? 10);
    const cursor = q.cursor as string | undefined;

    const page = paginate(it.comments, Math.max(1, Math.min(limit, 50)), cursor);
    return { ok: true, comments: page.items, nextCursor: page.nextCursor };
  });

  app.post<{ Params: { id: string }, Body: { text?: string } }>('/feed/:id/comments', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });

    const it = await getById(req.params.id);
    if (!it) return reply.code(404).send({ message: 'item no existe' });

    const text = (req.body?.text ?? '').trim();
    if (!text) return reply.code(400).send({ message: 'texto vacío' });
    if (text.length > 300) return reply.code(400).send({ message: 'muy largo' });

    const c: Comment = {
      id: randomUUID(),
      text,
      createdAt: new Date().toISOString(),
      author: { id: req.user.id, name: req.user.name },
      reactions: [],
    };
    await addComment(it.id, c);
    return { ok: true, comment: c };
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
      return { ok: true, comment: up };
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

  // Reacciones de comentario
  app.post<{ Params: { id: string, cid: string } }>(
    '/feed/:id/comments/:cid/like',
    async (req, reply) => {
      if (!req.user) return reply.code(401).send({ message: 'login requerido' });
      try {
        const c = await toggleCommentLike(req.params.id, req.params.cid, req.user.id);
        const body = {
          ...c,
          reactionsCount: c.reactions.length,
          likedByMe: c.reactions.includes(req.user.id),
        };
        return { ok: true, comment: body };
      } catch (e:any) {
        return reply.code(404).send({ message: e?.message || 'no existe' });
      }
    }
  );
}
