// app/backend/gateway/src/routes/feed.ts
import { FastifyInstance } from 'fastify';
import * as store from '../store/feedStore.js';

export default async function feedRoutes(app: FastifyInstance) {
  app.get('/feed', async () => {
    const items = await store.list();
    return { items };
  });

  app.post('/feed', async (req) => {
    const body = (req.body ?? {}) as { text?: string };
    const text = (body.text ?? '').toString().trim();
    if (!text) return { ok: false, error: 'text required' };
    const item = await store.create(text);
    return { ok: true, item };
  });

  app.delete('/feed/:id', async (req) => {
    const id = (req.params as { id: string }).id;
    const ok = await store.remove(id);
    return { ok };
  });
}
