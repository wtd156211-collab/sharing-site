import express from "express";
import { describe, expect, it } from "vitest";
import { NotFoundError, UnauthorizedError } from "@shared/_core/errors";
import { registerShareRoutes } from "./share";

const token = "a".repeat(43);

async function startRequest(config: Parameters<typeof registerShareRoutes>[1], path: string, init?: RequestInit) {
  const app = express();
  app.use(express.json());
  registerShareRoutes(app, config);
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("server did not start");
    return await fetch(`http://127.0.0.1:${address.port}${path}`, init);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  }
}

describe("share routes", () => {
  it("returns 404 for an unknown token without leaking lookup details", async () => {
    const response = await startRequest({
      findSpaceByTokenHash: async () => { throw NotFoundError("Share space not found"); },
      verifyAccessSession: async () => null,
      verifyPassword: async () => false,
      createAccessSession: async () => "unused",
      listEntries: async () => [],
    }, `/api/share/${token}`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "NOT_FOUND", message: "Share space not found" } });
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
  });

  it("requires a password session before returning protected space metadata", async () => {
    const response = await startRequest({
      findSpaceByTokenHash: async () => ({ id: 3, ownerId: 7, status: "active" as const, expiresAt: null, passwordHash: "hash", name: "家庭", description: null, allowComments: true, lastActivityAt: null, createdAt: new Date(), updatedAt: new Date() }),
      verifyAccessSession: async () => null,
      verifyPassword: async () => false,
      createAccessSession: async () => "unused",
      listEntries: async () => [],
    }, `/api/share/${token}`);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "PASSWORD_REQUIRED", message: "Password required" } });
  });

  it("returns entries only after a valid access session", async () => {
    let listed = false;
    const response = await startRequest({
      findSpaceByTokenHash: async () => ({ id: 3, ownerId: 7, status: "active" as const, expiresAt: null, passwordHash: null, name: "家庭", description: null, allowComments: true, lastActivityAt: null, createdAt: new Date(), updatedAt: new Date() }),
      verifyAccessSession: async () => ({ spaceId: 3 }),
      verifyPassword: async () => false,
      createAccessSession: async () => "unused",
      listEntries: async spaceId => { listed = spaceId === 3; return [{ id: 9, spaceId }]; },
    }, `/api/share/${token}/entries`);
    expect(response.status).toBe(200);
    expect(listed).toBe(true);
    expect(await response.json()).toEqual({ entries: [{ id: 9, spaceId: 3 }] });
  });

  it("rejects blank text entries before touching persistence", async () => {
    let inserted = false;
    const response = await startRequest({
      findSpaceByTokenHash: async () => ({ id: 3, ownerId: 7, status: "active" as const, expiresAt: null, passwordHash: null, name: "家庭", description: null, allowComments: true, lastActivityAt: null, createdAt: new Date(), updatedAt: new Date() }),
      authenticateAdmin: async () => ({ id: 7, name: null, email: null, role: "admin" as const }),
      insertEntry: async () => { inserted = true; return 1; },
    }, `/api/share/${token}/entries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "   " }) });
    expect(response.status).toBe(400);
    expect(inserted).toBe(false);
  });

  it("blocks comments when the space owner disabled them", async () => {
    const response = await startRequest({
      findSpaceByTokenHash: async () => ({ id: 3, ownerId: 7, status: "active" as const, expiresAt: null, passwordHash: null, name: "家庭", description: null, allowComments: false, lastActivityAt: null, createdAt: new Date(), updatedAt: new Date() }),
      insertComment: async () => 1,
    }, `/api/share/${token}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname: "家人", content: "你好" }) });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { code: "REQUEST_FAILED", message: "Comments are disabled" } });
  });
});
