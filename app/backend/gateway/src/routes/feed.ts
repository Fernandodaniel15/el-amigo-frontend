// app/backend/gateway/src/routes/feed.ts
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import {
  type Item,
  type Comment,
  getAll,
  getById,
  addItem,
  updateItem,
  removeItem,
  addComment,
  removeComment,
} from '../store/feedStore.js';

export default async function feedRoutes(app: FastifyInstance) {
  // ===== Items =====

  // LISTAR (más nuevo primero)
  app.get('/feed', async () => {
    const items = await getAll();
    return { items: [...items].reverse() };
  });

  // CREAR
  app.post<{ Body: { text?: string } }>('/feed', async (req, reply) => {
    const text = (req.body?.text ?? '').trim();
    if (!text) return reply.code(400).send({ message: 'texto vacío' });
    if (text.length > 500) return reply.code(400).send({ message: 'muy largo' });

    const item: Item = {
      id: randomUUID(),
      text,
      createdAt: new Date().toISOString(),
      comments: [],
    };
    await addItem(item);
    return { ok: true, item };
  });

  // ACTUALIZAR
  app.put<{ Params: { id: string }, Body: { text?: string } }>(
    '/feed/:id',
    async (req, reply) => {
      const text = (req.body?.text ?? '').trim();
      if (!text) return reply.code(400).send({ message: 'texto vacío' });

      const it = await updateItem(req.params.id, { text });
      if (!it) return reply.code(404).send({ message: 'no existe' });

      return { ok: true, item: it };
    }
  );

  // BORRAR
  app.delete<{ Params: { id: string } }>('/feed/:id', async (req, reply) => {
    const removed = await removeItem(req.params.id);
    if (!removed) return reply.code(404).send({ message: 'no existe' });
    return { ok: true, item: removed };
  });

  // ===== Comentarios =====

  // LISTAR (más nuevos primero)
  app.get<{ Params: { id: string } }>('/feed/:id/comments', async (req, reply) => {
    const it = await getById(req.params.id);
    if (!it) return reply.code(404).send({ message: 'item no existe' });
    return { comments: [...it.comments].reverse() };
  });

  // CREAR
  app.post<{ Params: { id: string }, Body: { text?: string } }>(
    '/feed/:id/comments',
    async (req, reply) => {
      const it = await getById(req.params.id);
      if (!it) return reply.code(404).send({ message: 'item no existe' });

      const text = (req.body?.text ?? '').trim();
      if (!text) return reply.code(400).send({ message: 'texto vacío' });
      if (text.length > 300) return reply.code(400).send({ message: 'muy largo' });

      const c: Comment = { id: randomUUID(), text, createdAt: new Date().toISOString() };
      await addComment(it.id, c);
      return { ok: true, comment: c };
    }
  );

  // BORRAR
  app.delete<{ Params: { id: string, cid: string } }>(
    '/feed/:id/comments/:cid',
    async (req, reply) => {
      try {
        await removeComment(req.params.id, req.params.cid);
        return { ok: true };
      } catch (e: any) {
        const msg = String(e?.message ?? 'error');
        if (msg.includes('no existe')) return reply.code(404).send({ message: msg });
        return reply.code(500).send({ message: 'error' });
      }
    }
  );
}
