import express from "express";
import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rateLimit";
import { redact } from "./redaction";
import { securityHeaders, sameOriginGuard } from "./headers";

describe("security controls", () => {
  it("limits repeated requests per key and expires old windows", () => {
    const limiter = createRateLimiter({ windowMs: 1_000, max: 2 });
    expect(limiter.allow("ip:1", 100)).toBe(true);
    expect(limiter.allow("ip:1", 200)).toBe(true);
    expect(limiter.allow("ip:1", 300)).toBe(false);
    expect(limiter.allow("ip:1", 1_101)).toBe(true);
  });

  it("redacts secrets recursively without mutating input", () => {
    const source = { token: "abc", nested: { password: "secret", safe: "ok" }, authorization: "Bearer abc" };
    expect(redact(source)).toEqual({ token: "[REDACTED]", nested: { password: "[REDACTED]", safe: "ok" }, authorization: "[REDACTED]" });
    expect(source.nested.password).toBe("secret");
  });

  it("adds browser security headers and blocks a mismatched Origin", async () => {
    const app = express();
    app.use(securityHeaders);
    app.post("/protected", sameOriginGuard, (_req, res) => res.json({ ok: true }));
    const server = app.listen(0);
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("server did not start");
      const blocked = await fetch(`http://127.0.0.1:${address.port}/protected`, { method: "POST", headers: { Origin: "https://evil.example" } });
      expect(blocked.status).toBe(403);
      const allowed = await fetch(`http://127.0.0.1:${address.port}/protected`, { method: "POST" });
      expect(allowed.status).toBe(200);
      expect(allowed.headers.get("x-content-type-options")).toBe("nosniff");
      expect(allowed.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    }
  });
});
