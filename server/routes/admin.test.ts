import express from "express";
import { describe, expect, it } from "vitest";
import { ForbiddenError, UnauthorizedError } from "@shared/_core/errors";
import { hashShareToken } from "../auth/shareToken";
import { registerAdminRoutes } from "./admin";

async function requestWithAuth(authenticateAdmin: Parameters<typeof registerAdminRoutes>[1]["authenticateAdmin"]) {
  const app = express();
  app.use(express.json());
  registerAdminRoutes(app, { authenticateAdmin });
  const server = app.listen(0);

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("server did not start");
    return await fetch(`http://127.0.0.1:${address.port}/api/admin/spaces`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  }
}

describe("admin routes", () => {
  it("rejects requests without an authenticated session", async () => {
    const response = await requestWithAuth(async () => {
      throw UnauthorizedError("Authentication required");
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    });
  });

  it("rejects authenticated users without the admin role", async () => {
    const response = await requestWithAuth(async () => {
      throw ForbiddenError("Admin access required");
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: { code: "FORBIDDEN", message: "Admin access required" },
    });
  });

  it("returns a raw share link once while persisting only its hash", async () => {
    const app = express();
    app.use(express.json());
    let inserted: { shareTokenHash?: string } | undefined;
    const admin = { id: 7, name: "小满", email: "a@example.com", role: "admin" as const };
    registerAdminRoutes(app, {
      authenticateAdmin: async () => admin,
      insertSpace: async values => {
        inserted = values;
        return 11;
      },
      findSpaceById: async () => ({
        id: 11,
        ownerId: 7,
        name: "家庭记录",
        description: null,
        allowComments: true,
        status: "active" as const,
        expiresAt: null,
        lastActivityAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    });
    const server = app.listen(0);

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("server did not start");
      const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/spaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "家庭记录" }),
      });
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.space.shareTokenHash).toBeUndefined();
      expect(body.shareUrl).toMatch(/^http:\/\/localhost:3000\/share\/[A-Za-z0-9_-]+$/);
      const token = body.shareUrl.split("/").pop();
      expect(inserted?.shareTokenHash).toBe(hashShareToken(token));
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    }
  });

  it("does not allow a space update when the authenticated owner does not match", async () => {
    const app = express();
    app.use(express.json());
    registerAdminRoutes(app, {
      authenticateAdmin: async () => ({ id: 7, name: null, email: null, role: "admin" as const }),
      updateSpaceByOwner: async () => false,
    });
    const server = app.listen(0);

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("server did not start");
      const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/spaces/99`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "越权" }),
      });
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: { code: "NOT_FOUND", message: "Space not found" } });
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    }
  });
});
