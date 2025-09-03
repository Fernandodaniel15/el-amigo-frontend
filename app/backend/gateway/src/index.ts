import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import feedRoutes from './routes/feed.js';
import authPlugin from './plugins/auth.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: ['http://localhost:3000'],
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['content-type','authorization']
});

await app.register(helmet);

await app.register(authPlugin);                    // /auth/*
await app.register(feedRoutes, { prefix: '/v1' }); // /v1/*

app.get('/v1/health', async () => ({ ok: true }));

const port = Number(process.env.PORT || 8080);
// usar 'localhost' evita el binding dual [::1] que a veces confunde en Windows
await app.listen({ port, host: 'localhost' });
app.log.info(`🚀 Gateway en http://localhost:${port}/v1`);
