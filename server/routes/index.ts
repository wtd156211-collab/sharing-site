import type { Express } from "express";
import { registerHealthRoute } from "./health";

export function registerApiRoutes(app: Express) {
  registerHealthRoute(app);
}
