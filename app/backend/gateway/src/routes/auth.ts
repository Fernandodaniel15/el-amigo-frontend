import { FastifyPluginAsync } from "fastify";

const plugin: FastifyPluginAsync = async (app) => {
  app.get("/.well-known/jwks.json", async () => {
    if (!process.env.JWT_JWKS) return app.httpErrors.internalServerError("JWT_JWKS faltante");
    return JSON.parse(process.env.JWT_JWKS);
  });
};
export default plugin;