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
    };
    await addItem(item);
    return { ok: true, item };
  });

  // ACTUALIZAR
  app.put<{ Params: { id: string }, Body: { text?: string } }>(
    '/feed/:id',
    async (req, reply) => {
      if (!req.user) return reply.code(401).send({ message: 'login requerido' });

      const text = (req.body?.text ?? '').trim();
      if (!text) return reply.code(400).send({ message: 'texto vacío' });

      const current = await getById(req.params.id);
      if (!current) return reply.code(404).send({ message: 'no existe' });
      if (current.author?.id && current.author.id !== req.user.id) {
        return reply.code(403).send({ message: 'forbidden' });
      }

      const it = await updateItem(req.params.id, { text });
      return { ok: true, item: it };
    }
  );

  // BORRAR
  app.delete<{ Params: { id: string } }>('/feed/:id', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ message: 'login requerido' });

    const current = await getById(req.params.id);
    if (!current) return reply.code(404).send({ message: 'no existe' });
    if (current.author?.id && current.author.id !== req.user.id) {
      return reply.code(403).send({ message: 'forbidden' });
    }

    const removed = await removeItem(req.params.id);
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
      };
      await addComment(it.id, c);
      return { ok: true, comment: c };
    }
  );

  // BORRAR
  app.delete<{ Params: { id: string, cid: string } }>(
    '/feed/:id/comments/:cid',
    async (req, reply) => {
      if (!req.user) return reply.code(401).send({ message: 'login requerido' });

      const it = await getById(req.params.id);
      if (!it) return reply.code(404).send({ message: 'item no existe' });

      const comment = it.comments.find(c => c.id === req.params.cid);
      if (!comment) return reply.code(404).send({ message: 'comentario no existe' });
      if (comment.author?.id && comment.author.id !== req.user.id) {
        return reply.code(403).send({ message: 'forbidden' });
      }

      await removeComment(req.params.id, req.params.cid);
      return { ok: true };
    }
  );

  // util opcional: limpiar todo (no exponer en prod)
  app.delete('/feed', async () => {
    // si hiciera falta limpiar, podríamos setear [] en el json; omitido para seguridad.
    return { ok: true };
  });
}
