// app/backend/gateway/src/plugins/auth.ts
import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export type User = { id: string; name: string };

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

function readCookie(req: FastifyRequest, name: string): string | undefined {
  const raw = req.headers.cookie || '';
  const parts = raw.split(';').map(s => s.trim());
  for (const p of parts) {
    const [k, ...v] = p.split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
}

export default fp(async function authPlugin(app: FastifyInstance) {
  // “middleware”: si viene cookie, seteamos req.user
  app.addHook('preHandler', async (req) => {
    const uid = readCookie(req, 'uid');
    const uname = readCookie(req, 'uname');
    if (uid && uname) {
      req.user = { id: uid, name: uname };
    }
  });

  // endpoints utilitarios
  app.get('/auth/me', async (req) => {
    if (!req.user) return { ok: true, user: null };
    return { ok: true, user: req.user };
  });

  app.post<{ Body: { id?: string; name?: string } }>('/auth/login', async (req, reply) => {
    const id = (req.body?.id ?? '').trim() || 'u1';
    const name = (req.body?.name ?? '').trim() || 'Fer';
    reply
      .header('Set-Cookie', [
        `uid=${encodeURIComponent(id)}; Path=/; HttpOnly`,
        `uname=${encodeURIComponent(name)}; Path=/`,
      ])
      .send({ ok: true, user: { id, name } });
  });

  app.post('/auth/logout', async (_req, reply) => {
    reply
      .header('Set-Cookie', [
        'uid=; Path=/; Max-Age=0',
        'uname=; Path=/; Max-Age=0',
      ])
      .send({ ok: true });
  });
});
