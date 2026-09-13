import type { Express, Request, Response } from "express";
import { z, ZodError } from "zod";
import { HttpError, NotFoundError, UnauthorizedError } from "@shared/_core/errors";
import type { Space } from "../../drizzle/schema";
import {
  createShareAccessSession,
  getShareAccessState,
  hashShareTokenForLookup,
  isShareTokenFormat,
  readShareAccessCookie,
  setShareAccessCookie,
  verifyShareAccessSession,
  verifySharePassword,
  type ShareAccessSession,
} from "../auth/shareAccess";
import { findSpaceRecordByTokenHash } from "../repositories/spaces";
import { listVisibleEntries } from "../repositories/entries";
import { toPublicSpace } from "../repositories/spaces";

const unlockSchema = z.object({ password: z.string().min(1).max(128) }).strict();

export type ShareRouteDependencies = {
  findSpaceByTokenHash: typeof findSpaceRecordByTokenHash;
  verifyAccessSession: typeof verifyShareAccessSession;
  verifyPassword: typeof verifySharePassword;
  createAccessSession: typeof createShareAccessSession;
  listEntries: typeof listVisibleEntries;
};

const defaultDependencies: ShareRouteDependencies = {
  findSpaceByTokenHash: findSpaceRecordByTokenHash,
  verifyAccessSession: verifyShareAccessSession,
  verifyPassword: verifySharePassword,
  createAccessSession: createShareAccessSession,
  listEntries: listVisibleEntries,
};

function sendError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid request" } });
    return;
  }
  if (error instanceof HttpError) {
    const code = error.statusCode === 401 && error.message === "Password required" ? "PASSWORD_REQUIRED" :
      error.statusCode === 401 && error.message === "Invalid password" ? "INVALID_PASSWORD" :
      error.statusCode === 404 ? "NOT_FOUND" : error.statusCode === 410 ? "GONE" : "REQUEST_FAILED";
    res.status(error.statusCode).json({ error: { code, message: error.message } });
    return;
  }
  console.error("[ShareRoute] request failed", error);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
}

function applyShareHeaders(res: Response) {
  res.setHeader("X-Robots-Tag", "noindex");
  res.setHeader("Cache-Control", "private, no-store");
}

function assertToken(token: string) {
  if (!isShareTokenFormat(token)) throw NotFoundError("Share space not found");
}

function assertSpaceAvailable(space: Space) {
  const state = getShareAccessState(space, new Date());
  if (state === "inactive") throw new HttpError(410, "Share space unavailable");
  if (state === "expired") throw new HttpError(410, "Share space expired");
  return state;
}

async function loadSpace(
  token: string,
  deps: ShareRouteDependencies,
): Promise<Space> {
  assertToken(token);
  const space = await deps.findSpaceByTokenHash(hashShareTokenForLookup(token));
  if (!space) throw NotFoundError("Share space not found");
  return space;
}

async function requireAccess(
  req: Request,
  space: Space,
  state: ReturnType<typeof getShareAccessState>,
  deps: ShareRouteDependencies,
): Promise<ShareAccessSession | null> {
  if (state !== "password") return null;
  const session = await deps.verifyAccessSession(readShareAccessCookie(req));
  if (!session || session.spaceId !== space.id) throw UnauthorizedError("Password required");
  return session;
}

export function registerShareRoutes(
  app: Pick<Express, "get" | "post">,
  overrides: Partial<ShareRouteDependencies> = {},
) {
  const deps = { ...defaultDependencies, ...overrides };

  app.get("/api/share/:token", async (req, res) => {
    applyShareHeaders(res);
    try {
      const space = await loadSpace(req.params.token, deps);
      const state = assertSpaceAvailable(space);
      await requireAccess(req, space, state, deps);
      res.json({ space: toPublicSpace(space) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/share/:token/unlock", async (req, res) => {
    applyShareHeaders(res);
    try {
      const space = await loadSpace(req.params.token, deps);
      const state = assertSpaceAvailable(space);
      const input = unlockSchema.parse(req.body);
      if (state !== "password" || !space.passwordHash) {
        res.json({ space: toPublicSpace(space) });
        return;
      }
      if (!(await deps.verifyPassword(input.password, space.passwordHash))) {
        throw UnauthorizedError("Invalid password");
      }
      const sessionToken = await deps.createAccessSession(space.id);
      setShareAccessCookie(res, sessionToken);
      res.json({ space: toPublicSpace(space) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/share/:token/entries", async (req, res) => {
    applyShareHeaders(res);
    try {
      const space = await loadSpace(req.params.token, deps);
      const state = assertSpaceAvailable(space);
      await requireAccess(req, space, state, deps);
      res.json({ entries: await deps.listEntries(space.id) });
    } catch (error) {
      sendError(res, error);
    }
  });
}
