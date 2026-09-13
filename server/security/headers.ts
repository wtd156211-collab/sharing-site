import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "@shared/_core/errors";
import { ENV } from "../_core/env";

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https:; frame-ancestors 'none'");
  next();
}

export function sameOriginGuard(req: Request, _res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (!origin) { next(); return; }
  let expected: string;
  try { expected = new URL(ENV.appBaseUrl).origin; } catch { throw ForbiddenError("Invalid application origin"); }
  if (origin !== expected) throw ForbiddenError("Invalid request origin");
  next();
}
