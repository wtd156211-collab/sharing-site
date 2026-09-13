import express, { type Express, type Request, type Response } from "express";
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
import { findSpaceByIdAndOwner, findSpaceRecordByTokenHash } from "../repositories/spaces";
import { listVisibleEntries } from "../repositories/entries";
import { toPublicSpace } from "../repositories/spaces";
import { authenticateAdmin } from "../auth/admin";
import { insertEntry, findEntryById, updateEntryVisibility } from "../repositories/entries";
import { insertComment, findCommentById, listVisibleComments, updateCommentStatus } from "../repositories/comments";
import { insertAttachment } from "../repositories/attachments";
import { getStorageAdapter } from "../storage";
import { processImage, ImageValidationError } from "../services/imageProcessor";
import { validateTextEntryInput } from "../validation/content";
import { validateCommentInput } from "../services/comments";
import { randomUUID } from "node:crypto";

const unlockSchema = z.object({ password: z.string().min(1).max(128) }).strict();

export type ShareRouteDependencies = {
  findSpaceByTokenHash: typeof findSpaceRecordByTokenHash;
  verifyAccessSession: typeof verifyShareAccessSession;
  verifyPassword: typeof verifySharePassword;
  createAccessSession: typeof createShareAccessSession;
  listEntries: typeof listVisibleEntries;
  listComments: typeof listVisibleComments;
  authenticateAdmin: typeof authenticateAdmin;
  insertEntry: typeof insertEntry;
  insertComment: typeof insertComment;
  findEntryById: typeof findEntryById;
  findCommentById: typeof findCommentById;
  insertAttachment: typeof insertAttachment;
  updateEntryVisibility: typeof updateEntryVisibility;
  updateCommentStatus: typeof updateCommentStatus;
  findSpaceByIdAndOwner: typeof findSpaceByIdAndOwner;
  storage: ReturnType<typeof getStorageAdapter>;
};

const defaultDependencies: ShareRouteDependencies = {
  findSpaceByTokenHash: findSpaceRecordByTokenHash,
  verifyAccessSession: verifyShareAccessSession,
  verifyPassword: verifySharePassword,
  createAccessSession: createShareAccessSession,
  listEntries: listVisibleEntries,
  listComments: listVisibleComments,
  authenticateAdmin,
  insertEntry,
  insertComment,
  findEntryById,
  findCommentById,
  insertAttachment,
  updateEntryVisibility,
  updateCommentStatus,
  findSpaceByIdAndOwner,
  storage: getStorageAdapter(),
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
  if (error instanceof ImageValidationError) {
    res.status(400).json({ error: { code: "INVALID_IMAGE", message: error.message } });
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
  app: Pick<Express, "get" | "post" | "delete">,
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

  app.post("/api/share/:token/entries", async (req, res) => {
    applyShareHeaders(res);
    try {
      const space = await loadSpace(req.params.token, deps);
      assertSpaceAvailable(space);
      const admin = await deps.authenticateAdmin(req);
      if (admin.id !== space.ownerId) throw new HttpError(403, "Space owner access required");
      const input = validateTextEntryInput(req.body);
      const id = await deps.insertEntry({ spaceId: space.id, authorId: admin.id, entryType: "text", textContent: input.text });
      res.status(201).json({ entry: { id, spaceId: space.id, entryType: "text", textContent: input.text } });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/share/:token/comments", async (req, res) => {
    applyShareHeaders(res);
    try {
      const space = await loadSpace(req.params.token, deps);
      const state = assertSpaceAvailable(space);
      await requireAccess(req, space, state, deps);
      if (!space.allowComments) throw new HttpError(403, "Comments are disabled");
      const input = validateCommentInput(req.body);
      if (input.entryId !== undefined) {
        const entry = await deps.findEntryById(input.entryId);
        if (!entry || entry.spaceId !== space.id) throw new HttpError(400, "Entry does not belong to this space");
      }
      if (input.replyToCommentId !== undefined) {
        const comment = await deps.findCommentById(input.replyToCommentId);
        if (!comment || comment.spaceId !== space.id) throw new HttpError(400, "Comment does not belong to this space");
      }
      const id = await deps.insertComment({ spaceId: space.id, entryId: input.entryId ?? null, nickname: input.nickname, content: input.content, replyToCommentId: input.replyToCommentId ?? null });
      res.status(201).json({ comment: { id, spaceId: space.id, entryId: input.entryId ?? null, nickname: input.nickname, content: input.content, replyToCommentId: input.replyToCommentId ?? null } });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/share/:token/comments", async (req, res) => {
    applyShareHeaders(res);
    try {
      const space = await loadSpace(req.params.token, deps);
      const state = assertSpaceAvailable(space);
      await requireAccess(req, space, state, deps);
      const entryId = req.query.entryId ? Number(req.query.entryId) : undefined;
      if (entryId !== undefined && (!Number.isSafeInteger(entryId) || entryId <= 0)) throw new HttpError(400, "Invalid entry id");
      res.json({ comments: await deps.listComments(space.id, entryId) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/share/:token/images", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "10mb" }), async (req, res) => {
    applyShareHeaders(res);
    try {
      const space = await loadSpace(req.params.token, deps);
      assertSpaceAvailable(space);
      const admin = await deps.authenticateAdmin(req);
      if (admin.id !== space.ownerId) throw new HttpError(403, "Space owner access required");
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body?.dataBase64 === "string" ? req.body.dataBase64 : "", "base64");
      const mimeType = Buffer.isBuffer(req.body) ? String(req.headers["content-type"] ?? "") : String(req.body?.mimeType ?? "");
      const encodedName = Buffer.isBuffer(req.body) ? String(req.headers["x-file-name"] ?? "upload") : String(req.body?.fileName ?? "upload");
      let originalName = encodedName;
      try { originalName = decodeURIComponent(encodedName); } catch { /* keep the safe fallback */ }
      const image = await processImage({ buffer: body, mimeType, originalName });
      const keyBase = `images/${space.id}/${randomUUID()}`;
      const extension = image.mimeType === "image/jpeg" ? ".jpg" : image.mimeType === "image/png" ? ".png" : ".webp";
      const original = await deps.storage.put(`${keyBase}${extension}`, image.buffer, image.mimeType);
      const thumbnail = await deps.storage.put(`${keyBase}_thumb${extension}`, image.thumbnail, image.mimeType);
      const entryId = await deps.insertEntry({ spaceId: space.id, authorId: admin.id, entryType: "image", textContent: null });
      await deps.insertAttachment({ entryId, storageKey: original.key, thumbnailKey: thumbnail.key, originalName: image.originalName, mimeType: image.mimeType, fileSize: image.buffer.length, width: image.width, height: image.height });
      res.status(201).json({ entry: { id: entryId, spaceId: space.id, entryType: "image", attachment: { url: original.url, thumbnailUrl: thumbnail.url, width: image.width, height: image.height } } });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete("/api/admin/entries/:id", async (req, res) => {
    try {
      const admin = await deps.authenticateAdmin(req);
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, "Invalid entry id");
      const entry = await deps.findEntryById(id);
      if (!entry) throw new HttpError(404, "Entry not found");
      const space = await deps.findSpaceByIdAndOwner(entry.spaceId, admin.id);
      if (!space) throw new HttpError(404, "Entry not found");
      await deps.updateEntryVisibility(id, entry.spaceId, "deleted");
      res.json({ ok: true });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete("/api/admin/comments/:id", async (req, res) => {
    try {
      const admin = await deps.authenticateAdmin(req);
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, "Invalid comment id");
      const comment = await deps.findCommentById(id);
      if (!comment) throw new HttpError(404, "Comment not found");
      const space = await deps.findSpaceByIdAndOwner(comment.spaceId, admin.id);
      if (!space) throw new HttpError(404, "Comment not found");
      await deps.updateCommentStatus(id, comment.spaceId, "deleted");
      res.json({ ok: true });
    } catch (error) {
      sendError(res, error);
    }
  });
}
