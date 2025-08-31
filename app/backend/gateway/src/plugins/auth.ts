/** 
 * AMIGO :: BLOQUE: auth · SUBMÓDULO: gateway-auth-plugin · ACCIÓN(ES): CREAR
 * SUPERFICIE UI: feed/login
 * DEPENDENCIAS: @fastify/cookie
 * CONTRATOS: /auth/login|logout|me
 * COMPAT: backward-compatible
 * SLOs: p95<50ms
 * PRIVACIDAD: cookie httpOnly
 * OBSERVABILIDAD: logs fastify
 * RIESGOS MITIGADOS: spoof básico (solo dev)
 * DESCRIPCIÓN: auth dev muy simple para atar author a ítems/comentarios
 */
// app/backend/gateway/src/plugins/auth.ts
import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';

type User = { id: string; name: string };

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

export default fp(async (app) => {
  await app.register(cookie, { secret: 'dev-secret' });

  // Cargar user desde cookie
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
    });
    return { ok: true, user };
  });

  app.post('/auth/logout', async (_req, reply) => {
    reply.clearCookie('auth_user', { path: '/' });
    return { ok: true };
  });

  app.get('/auth/me', async (req) => {
    return { ok: true, user: req.user ?? null };
  });
});
