import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

type Item = { id: string; text: string; createdAt: string };

const store: Item[] = []; // en memoria

export default async function feedRoutes(app: FastifyInstance) {
  // LISTAR
  app.get('/feed', async () => {
    // más nuevo primero
    return { items: [...store].reverse() };
  });

  // CREAR
  app.post<{ Body: { text?: string } }>('/feed', async (req, reply) => {
    const text = (req.body?.text ?? '').trim();
    if (!text) return reply.code(400).send({ ok: false, error: 'texto vacío' });
    if (text.length > 500) return reply.code(400).send({ ok: false, error: 'muy largo' });

    const item: Item = { id: randomUUID(), text, createdAt: new Date().toISOString() };
    store.push(item);
    return { ok: true, item };
  });

  // ACTUALIZAR
  app.put<{ Params: { id: string }, Body: { text?: string } }>('/feed/:id', async (req, reply) => {
    const id = req.params.id;
    const text = (req.body?.text ?? '').trim();
    if (!text) return reply.code(400).send({ ok: false, error: 'texto vacío' });

    const idx = store.findIndex(i => i.id === id);
    if (idx === -1) return reply.code(404).send({ ok: false, error: 'no existe' });

    store[idx] = { ...store[idx], text };
    return { ok: true, item: store[idx] };
  });

  // BORRAR
  app.delete<{ Params: { id: string } }>('/feed/:id', async (req, reply) => {
    const id = req.params.id;
    const idx = store.findIndex(i => i.id === id);
    if (idx === -1) return reply.code(404).send({ ok: false, error: 'no existe' });

    const [deleted] = store.splice(idx, 1);
    return { ok: true, item: deleted };
  });
}
// app/backend/gateway/src/routes/feed.ts