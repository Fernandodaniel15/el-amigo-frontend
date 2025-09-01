/**
 * AMIGO :: BLOQUE: auth · SUBMÓDULO: gateway-auth-plugin · ACCIÓN: MODIFICAR
 * DESCRIPCIÓN: auth dev simple para atar author a ítems/comentarios
 */
import fp from 'fastify-plugin/plugin.js';
import cookie from '@fastify/cookie';

export type User = { id: string; name: string };

declare module 'fastify' {
  interface FastifyRequest { user?: User; }
}

export default fp(async (app) => {
  await app.register(cookie, { secret: 'dev-secret' });

  // carga user desde cookie
  app.addHook('preHandler', async (req) => {
    const raw = req.cookies['auth_user'];
    if (!raw) return;
    try {
      const u = JSON.parse(raw) as User;
      if (u && u.id && u.name) req.user = u;
    } catch {}
  });

  app.post('/auth/login', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<User>;
    const id = (body.id ?? 'u1').toString();
    const name = (body.name ?? 'User').toString();
    const user: User = { id, name };
    reply.setCookie('auth_user', JSON.stringify(user), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false // dev en http://
    });
    return { ok: true, user };
  });

  app.post('/auth/logout', async (_req, reply) => {
    reply.clearCookie('auth_user', { path: '/' });
    return { ok: true };
  });

  app.get('/auth/me', async (req) => ({ ok: true, user: req.user ?? null }));
});
