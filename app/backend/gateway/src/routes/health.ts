import { FastifyPluginAsync } from "fastify";
const plugin: FastifyPluginAsync = async (app) => {
  app.get("/", async () => ({ ok: true, ts: new Date().toISOString() }));
};
export default plugin;