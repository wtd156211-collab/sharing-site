import type { Express } from "express";
import { registerAdminRoutes } from "./admin";
import { registerHealthRoute } from "./health";
import { registerShareRoutes } from "./share";
import { registerEventRoutes } from "./events";

export function registerApiRoutes(app: Express) {
  registerHealthRoute(app);
  registerAdminRoutes(app);
  registerShareRoutes(app);
  registerEventRoutes(app);
}
