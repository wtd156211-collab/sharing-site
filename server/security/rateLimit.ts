import type { NextFunction, Request, Response } from "express";

type RateLimitOptions = { windowMs: number; max: number; keyGenerator?: (req: Request) => string };
type Bucket = { startedAt: number; count: number };

export function createRateLimiter(options: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();
  return {
    allow(key: string, now = Date.now()) {
      const current = buckets.get(key);
      if (!current || now - current.startedAt >= options.windowMs) {
        buckets.set(key, { startedAt: now, count: 1 });
        return true;
      }
      if (current.count >= options.max) return false;
      current.count += 1;
      return true;
    },
    middleware(req: Request, res: Response, next: NextFunction) {
      const key = options.keyGenerator?.(req) ?? req.ip ?? req.socket.remoteAddress ?? "unknown";
      const limiter = this as ReturnType<typeof createRateLimiter>;
      if (!limiter.allow(key)) {
        res.setHeader("Retry-After", Math.ceil(options.windowMs / 1000));
        res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests" } });
        return;
      }
      next();
    },
  };
}

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const limiter = createRateLimiter(options);
  return (req: Request, res: Response, next: NextFunction) => limiter.middleware(req, res, next);
}
