import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { registerApiRoutes } from "../routes";
import { createContext } from "./context";
import { assertProductionEnv, ENV } from "./env";
import { serveStatic, setupVite } from "./vite";
import { securityHeaders, sameOriginGuard } from "../security/headers";
import { createRateLimitMiddleware } from "../security/rateLimit";
import { HttpError } from "@shared/_core/errors";
import { redact } from "../security/redaction";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  assertProductionEnv();
  const app = express();
  const server = createServer(app);
  app.use(securityHeaders);
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));
  app.use("/api", createRateLimitMiddleware({ windowMs: 60_000, max: 120 }));
  app.use("/api", (req, res, next) => {
    if (["POST", "PATCH", "DELETE"].includes(req.method)) return sameOriginGuard(req, res, next);
    next();
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  registerApiRoutes(app);
  app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) { next(error); return; }
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: { code: "REQUEST_FAILED", message: error.message } });
      return;
    }
    console.error("[HTTP] request failed", redact({ method: req.method, path: req.path, error: String(error) }));
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = ENV.port;
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
