// app/backend/gateway/src/index.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import feedRoutes from './routes/feed.js';
import authPlugin from './plugins/auth.js';

const app = Fastify({ logger: true });

await app.register(helmet);

// CORS para 3000/3001
await app.register(cors, {
  origin: [
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'http://localhost:3001', 'http://127.0.0.1:3001',
  ],
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true, // importante para cookies cross-site
});

await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

// Auth (fake)
await app.register(authPlugin);

// Health
app.get('/health', async () => ({ ok: true }));

// API
await app.register(feedRoutes, { prefix: '/v1' });

const PORT = Number(process.env.PORT ?? 8080);

app
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`Gateway listo http://localhost:${PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

export default app;
