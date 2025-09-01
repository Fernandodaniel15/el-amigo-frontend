/** * AMIGO :: BLOQUE: gateway · SUBMÓDULO: rutas-feed · ACCIÓN(ES): MODIFICAR

SUPERFICIE UI: feed

DEPENDENCIAS: store-json, auth-plugin

CONTRATOS: /v1/feed* · COMPAT: backward-compatible

SLOs: p95<100ms

PRIVACIDAD: cookie httpOnly

RIESGOS MITIGADOS: autorización por autor

DESCRIPCIÓN: CRUD + comentarios + reacciones + paginación
*/
// app/backend/gateway/src/routes/feed.ts
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import {
  type Item, type Comment, getAll, getById, addItem, updateItem, removeItem,
  addComment, updateComment, removeComment, toggleItemLike, toggleCommentLike,
  paginate
} from '../store/feedStore.js';

export default async function feedRoutes(app: FastifyInstance) {
  // ===== Items =====
  app.get('/feed', async (req) => {
    const limit = Number((req.query as any)?.limit ?? 10);
    const cursor = (req.query as any)?.cursor as string | undefined;
    const page = paginate(await getAll(), Math.max(1, Math.min(limit, 50)), cursor);
    return { ok: true, ...page };
  });

  app.post<{ Body: { text?: string } }>('/feed', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });
    const text = (req.body?.text ?? '').trim();
    if (!text) return reply.code(400).send({ message: 'texto vacío' });
    if (text.length > 500) return reply.code(400).send({ message: 'muy largo' });

    const item: Item = {
      id: randomUUID(),
      text, createdAt: new Date().toISOString(),
      author: { id: req.user.id, name: req.user.name },
      comments: [], reactions: []
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
    const it = await toggleItemLike(req.params.id, req.user.id);
    return { ok: true, item: it };
  });

  // ===== Comentarios =====
  app.get<{ Params: { id: string } }>('/feed/:id/comments', async (req, reply) => {
    const it = await getById(req.params.id);
    if (!it) return reply.code(404).send({ message: 'item no existe' });

    const limit = Number((req.query as any)?.limit ?? 10);
    const cursor = (req.query as any)?.cursor as string | undefined;
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
      id: randomUUID(), text, createdAt: new Date().toISOString(),
      author: { id: req.user.id, name: req.user.name }, reactions: []
    };
    await addComment(it.id, c);
    return { ok: true, comment: c };
  });

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
      return { ok: true, comment: up };
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

  // Reacciones de comentario
  app.post<{ Params: { id: string, cid: string } }>(
    '/feed/:id/comments/:cid/like', async (req, reply) => {
      if (!req.user) return reply.code(401).send({ message: 'login requerido' });
      const c = await toggleCommentLike(req.params.id, req.params.cid, req.user.id);
      return { ok: true, comment: c };
    }
  );
}
