/**
 * AMIGO :: BLOQUE: auth · SUBMÓDULO: gateway-bootstrap · ACCIÓN(ES): MODIFICAR
 * SUPERFICIE UI: feed/login
 * DEPENDENCIAS: @fastify/cookie, ./plugins/auth
 * COMPAT: backward-compatible
 * DESCRIPCIÓN: registra cookie+auth; CORS con credenciales
 */
// app/backend/gateway/src/index.ts
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';

// ...
await app.register(cookie, { secret: 'dev-secret' });

await app.register(cors, {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ],
  credentials: true, // << necesario para cookies
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
});
