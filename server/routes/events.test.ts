import express from "express";
import { describe, expect, it } from "vitest";
import { registerEventRoutes } from "./events";

const token = "b".repeat(43);

describe("event sync route", () => {
  it("returns events after the requested id without private payload fields", async () => {
    const app = express();
    registerEventRoutes(app, {
      findSpaceByTokenHash: async () => ({ id: 4, ownerId: 7, status: "active" as const, expiresAt: null, passwordHash: null, name: "家庭", description: null, allowComments: true, lastActivityAt: null, createdAt: new Date(), updatedAt: new Date() }),
      verifyAccessSession: async () => null,
      listEvents: async () => [{ id: 8, spaceId: 4, eventType: "entry.created", entityId: 12, payloadJson: JSON.stringify({ entryId: 12 }), createdAt: new Date() }],
    });
    const server = app.listen(0);
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("server did not start");
      const response = await fetch(`http://127.0.0.1:${address.port}/api/share/${token}/sync?afterEventId=7`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ events: [{ id: 8, spaceId: 4, type: "entry.created", entityId: 12, payload: { entryId: 12 }, createdAt: expect.any(String) }] });
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    }
  });
});
