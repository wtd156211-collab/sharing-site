import express from "express";
import { describe, expect, it } from "vitest";
import { registerHealthRoute } from "./health";

describe("GET /health", () => {
  it("returns only the public health status", async () => {
    const app = express();
    registerHealthRoute(app);
    const server = app.listen(0);

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("server did not start");
      const response = await fetch(`http://127.0.0.1:${address.port}/health`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    }
  });
});
