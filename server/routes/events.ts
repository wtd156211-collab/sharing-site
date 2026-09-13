import type { Express, Request, Response } from "express";
import { HttpError, NotFoundError, UnauthorizedError } from "@shared/_core/errors";
import type { Space } from "../../drizzle/schema";
import { hashShareTokenForLookup, getShareAccessState, readShareAccessCookie, verifyShareAccessSession, type ShareAccessSession } from "../auth/shareAccess";
import { findSpaceRecordByTokenHash } from "../repositories/spaces";
import { listSpaceEventsAfter } from "../repositories/events";
import { spaceEventBus, type SpaceEvent } from "../realtime/spaceEvents";

export type EventRouteDependencies = {
  findSpaceByTokenHash: typeof findSpaceRecordByTokenHash;
  verifyAccessSession: typeof verifyShareAccessSession;
  listEvents: typeof listSpaceEventsAfter;
  subscribe: typeof spaceEventBus.subscribe;
};

const defaultDependencies: EventRouteDependencies = {
  findSpaceByTokenHash: findSpaceRecordByTokenHash,
  verifyAccessSession: verifyShareAccessSession,
  listEvents: listSpaceEventsAfter,
  subscribe: spaceEventBus.subscribe.bind(spaceEventBus),
};

function sendError(res: Response, error: unknown) {
  if (error instanceof HttpError) {
    const code = error.statusCode === 404 ? "NOT_FOUND" : error.statusCode === 410 ? "GONE" : error.statusCode === 401 ? "PASSWORD_REQUIRED" : "REQUEST_FAILED";
    res.status(error.statusCode).json({ error: { code, message: error.message } });
    return;
  }
  console.error("[EventRoute] request failed", error);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
}

function applyHeaders(res: Response) {
  res.setHeader("X-Robots-Tag", "noindex");
  res.setHeader("Cache-Control", "no-store");
}

async function loadAccessibleSpace(req: Request, deps: EventRouteDependencies): Promise<{ space: Space; session: ShareAccessSession | null }> {
  const token = req.params.token;
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(token)) throw NotFoundError("Share space not found");
  const space = await deps.findSpaceByTokenHash(hashShareTokenForLookup(token));
  if (!space) throw NotFoundError("Share space not found");
  const state = getShareAccessState(space, new Date());
  if (state === "inactive") throw new HttpError(410, "Share space unavailable");
  if (state === "expired") throw new HttpError(410, "Share space expired");
  if (state === "password") {
    const session = await deps.verifyAccessSession(readShareAccessCookie(req));
    if (!session || session.spaceId !== space.id) throw UnauthorizedError("Password required");
    return { space, session };
  }
  return { space, session: null };
}

function serializeEvent(event: SpaceEvent | { id: number; spaceId: number; eventType: string; entityId: number | null; payloadJson: string; createdAt: Date }) {
  if ("type" in event) return event;
  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(event.payloadJson) as Record<string, unknown>; } catch { /* ignore malformed historical payload */ }
  return { id: event.id, spaceId: event.spaceId, type: event.eventType, entityId: event.entityId, payload, createdAt: event.createdAt.toISOString() };
}

export function registerEventRoutes(app: Pick<Express, "get">, overrides: Partial<EventRouteDependencies> = {}) {
  const deps = { ...defaultDependencies, ...overrides };

  app.get("/api/share/:token/sync", async (req, res) => {
    applyHeaders(res);
    try {
      const { space } = await loadAccessibleSpace(req, deps);
      const afterEventId = Number(req.query.afterEventId ?? 0);
      if (!Number.isSafeInteger(afterEventId) || afterEventId < 0) throw new HttpError(400, "Invalid event id");
      const events = await deps.listEvents(space.id, afterEventId);
      res.json({ events: events.map(serializeEvent) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/share/:token/events", async (req, res) => {
    applyHeaders(res);
    try {
      const { space } = await loadAccessibleSpace(req, deps);
      res.status(200).set({ "Content-Type": "text/event-stream", Connection: "keep-alive" });
      res.flushHeaders?.();
      res.write(`retry: 3000\n\n`);
      const listener = (event: SpaceEvent) => {
        res.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`);
      };
      const unsubscribe = deps.subscribe(space.id, listener);
      const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);
      req.on("close", () => { clearInterval(heartbeat); unsubscribe(); });
    } catch (error) {
      sendError(res, error);
    }
  });
}
