import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';

const mediaRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // POST /v1/media/upload/presign -> stub que devuelve URLs simuladas
  app.post('/media/upload/presign', async (req, reply) => {
    const body = (req.body as any) || {};
    const { contentType, size } = body;

    if (!contentType || typeof size !== 'number') {
      return reply.status(400).send({ error: 'bad-request' });
    }

    const key = `u/local/${crypto.randomUUID()}`;
    return {
      url: 'https://example.invalid/upload',       // stub
      publicUrl: `https://cdn.local/${key}`,       // stub
      key,
      expiresIn: 600,
    };
  });
};

export default mediaRoutes;
