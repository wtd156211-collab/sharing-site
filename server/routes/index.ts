import type { Express } from "express";
import { registerAdminRoutes } from "./admin";
import { registerHealthRoute } from "./health";

export function registerApiRoutes(app: Express) {
  registerHealthRoute(app);
  registerAdminRoutes(app);
}
