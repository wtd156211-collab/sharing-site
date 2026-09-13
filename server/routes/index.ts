import type { Express } from "express";
import { registerAdminRoutes } from "./admin";
import { registerHealthRoute } from "./health";
import { registerShareRoutes } from "./share";

export function registerApiRoutes(app: Express) {
  registerHealthRoute(app);
  registerAdminRoutes(app);
  registerShareRoutes(app);
}
