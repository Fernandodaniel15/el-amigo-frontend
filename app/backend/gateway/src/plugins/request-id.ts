import { FastifyPluginAsync } from "fastify";

export const requestIdPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (req, reply) => {
    const id = (req.headers["x-request-id"] as string) || crypto.randomUUID();
    reply.header("x-request-id", id);
  });
};