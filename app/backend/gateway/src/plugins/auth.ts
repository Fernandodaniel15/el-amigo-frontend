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

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; name: string } | null;
  }
}

export default fp(async (app) => {
  app.decorateRequest('user', null);

  app.addHook('preHandler', async (req) => {
    const raw = req.cookies?.me;
    if (raw) {
      try { req.user = JSON.parse(raw); } catch { req.user = null; }
    } else {
      req.user = null;
    }
  });

  app.post('/auth/login', async (req, reply) => {
    const { id, name } = (req.body ?? {}) as { id?: string; name?: string };
    const user = { id: id || 'u1', name: name || 'Fer' };
    reply
      .setCookie('me', JSON.stringify(user), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      })
      .send({ ok: true, user });
  });

  app.post('/auth/logout', async (_req, reply) => {
    reply.clearCookie('me', { path: '/' }).send({ ok: true });
  });

  app.get('/auth/me', async (req) => {
    return { ok: true, user: req.user ?? null };
  });
});
