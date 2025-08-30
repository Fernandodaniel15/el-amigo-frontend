/**
 * AMIGO :: BLOQUE: auth · SUBMÓDULO: gateway-bootstrap · ACCIÓN(ES): MODIFICAR
 * SUPERFICIE UI: feed/login
 * DEPENDENCIAS: @fastify/cookie, ./plugins/auth
 * COMPAT: backward-compatible
 * DESCRIPCIÓN: registra cookie+auth; CORS con credenciales
 */
// app/backend/gateway/src/index.ts (fragmento relevante)
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import authPlugin from './plugins/auth.js';
import feedRoutes from './routes/feed.js';

const app = Fastify({ logger: true });

await app.register(helmet);
await app.register(cookie, { secret: 'dev-secret' });

await app.register(cors, {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
});

await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

// Health
app.get('/health', async () => ({ ok: true }));

// Auth
await app.register(authPlugin);

// API
await app.register(feedRoutes, { prefix: '/v1' });

const PORT = Number(process.env.PORT ?? 8080);
app
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`Gateway listo http://localhost:${PORT}`))
  .catch((err) => { app.log.error(err); process.exit(1); });

export default app;
