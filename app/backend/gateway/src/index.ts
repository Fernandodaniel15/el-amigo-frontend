/**
 * AMIGO :: gateway bootstrap (CORS + /v1 + auth)
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import feedRoutes from './routes/feed.js';
import authPlugin from './plugins/auth.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ],
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
});

await app.register(helmet);
await app.register(authPlugin);                      // /auth/*
await app.register(feedRoutes, { prefix: '/v1' });  // /v1/feed*

app.get('/v1/health', async () => ({ ok: true }));

const port = Number(process.env.PORT || 8080);
await app.listen({ port, host: 'localhost' });      // host "localhost" (no ::1)
app.log.info(`🚀 Gateway en http://localhost:${port}/v1`);
