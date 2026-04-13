import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { registerBeaconRoutes } from "./beacon.js";
import { registerAdminRoutes, setShutdownFn } from "./admin.js";

const app = new Hono();

registerBeaconRoutes(app);
registerAdminRoutes(app);

export { app };

export function startServer(
  port: number,
  host: string,
): ReturnType<typeof serve> {
  const server = serve({ fetch: app.fetch, port, hostname: host }, () => {
    console.log(`CL mock server listening on http://${host}:${port}`);
  });

  const shutdown = () => {
    console.log("Shutting down...");
    server.close(() => process.exit(0));
  };

  setShutdownFn(shutdown);
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return server;
}
