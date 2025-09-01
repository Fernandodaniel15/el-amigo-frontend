/** * AMIGO :: BLOQUE: gateway · SUBMÓDULO: bootstrap · ACCIÓN(ES): MODIFICAR

SUPERFICIE UI: feed/login

DEPENDENCIAS: fastify, cors, helmet, cookie, rate-limit, rutas

CONTRATOS: /auth/* (sin /v1), /v1/*

COMPAT: backward-compatible

SLOs: p95<100ms

DESCRIPCIÓN: arranque servidor + rate-limit + prefijos
*/
// app/backend/gateway/src/index.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import authPlugin from './plugins/auth.js';
import feedRoutes from './routes/feed.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: ['http://localhost:3000','http://127.0.0.1:3000','http://localhost:3001','http://127.0.0.1:3001'],
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
});
await app.register(helmet);
await app.register(rateLimit, { max: 120, timeWindow: '1 minute' }); // simple
await app.register(authPlugin);
await app.register(feedRoutes, { prefix: '/v1' });

app.get('/v1/health', async () => ({ ok: true }));

const port = Number(process.env.PORT || 8080);
await app.listen({ port });
console.log(`Gateway en http://localhost:${port}/v1`);
