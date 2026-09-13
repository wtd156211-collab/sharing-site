import { z, ZodError } from "zod";
import type { Express, Response } from "express";
import { HttpError } from "@shared/_core/errors";
import { ENV } from "../_core/env";
import { authenticateAdmin, toPublicAdminUser } from "../auth/admin";
import { generateShareToken, hashShareToken } from "../auth/shareToken";
import {
  findSpaceById,
  findSpaceByIdAndOwner,
  insertSpace,
  listSpacesByOwner,
  updateSpaceByOwner,
} from "../repositories/spaces";

const createSpaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  allowComments: z.boolean().optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
}).strict();

const updateSpaceSchema = createSpaceSchema.partial();

export type AdminRouteDependencies = {
  authenticateAdmin: typeof authenticateAdmin;
  listSpaces: typeof listSpacesByOwner;
  findSpaceById: typeof findSpaceById;
  findSpaceByIdAndOwner: typeof findSpaceByIdAndOwner;
  insertSpace: typeof insertSpace;
  updateSpaceByOwner: typeof updateSpaceByOwner;
};

const defaultDependencies: AdminRouteDependencies = {
  authenticateAdmin,
  listSpaces: listSpacesByOwner,
  findSpaceById,
  findSpaceByIdAndOwner,
  insertSpace,
  updateSpaceByOwner,
};

function errorCode(statusCode: number): string {
  if (statusCode === 400) return "INVALID_INPUT";
  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  return "INTERNAL_ERROR";
}

function sendError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid request" } });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: { code: errorCode(error.statusCode), message: error.message } });
    return;
  }
  console.error("[AdminRoute] request failed", error);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
}

function parseSpaceId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, "Invalid space id");
  return id;
}

function toInsertValues(input: z.infer<typeof createSpaceSchema>, ownerId: number, shareTokenHash: string) {
  return {
    ownerId,
    name: input.name,
    description: input.description ?? null,
    allowComments: input.allowComments === false ? 0 : 1,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    shareTokenHash,
  };
}

function shareUrl(token: string): string {
  return new URL(`/share/${token}`, ENV.appBaseUrl).toString();
}

export function registerAdminRoutes(
  app: Pick<Express, "get" | "post" | "patch" | "delete">,
  overrides: Partial<AdminRouteDependencies> = {},
) {
  const deps = { ...defaultDependencies, ...overrides };

  app.post("/api/admin/login", async (req, res) => {
    try {
      const user = await deps.authenticateAdmin(req);
      res.json({ user: toPublicAdminUser(user) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/admin/spaces", async (req, res) => {
    try {
      const user = await deps.authenticateAdmin(req);
      res.json({ spaces: await deps.listSpaces(user.id) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/admin/spaces", async (req, res) => {
    try {
      const user = await deps.authenticateAdmin(req);
      const input = createSpaceSchema.parse(req.body);
      const token = generateShareToken();
      const id = await deps.insertSpace(toInsertValues(input, user.id, hashShareToken(token)));
      const space = await deps.findSpaceById(id);
      if (!space) throw new Error("Created space could not be loaded");
      res.status(201).json({ space, shareUrl: shareUrl(token) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.patch("/api/admin/spaces/:id", async (req, res) => {
    try {
      const user = await deps.authenticateAdmin(req);
      const id = parseSpaceId(req.params.id);
      const input = updateSpaceSchema.parse(req.body);
      const values: Record<string, unknown> = {};
      if (input.name !== undefined) values.name = input.name;
      if (input.description !== undefined) values.description = input.description;
      if (input.allowComments !== undefined) values.allowComments = input.allowComments ? 1 : 0;
      if (input.expiresAt !== undefined) values.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      if (Object.keys(values).length === 0) throw new HttpError(400, "No fields to update");

      const updated = await deps.updateSpaceByOwner(id, user.id, values);
      if (!updated) throw new HttpError(404, "Space not found");
      const space = await deps.findSpaceByIdAndOwner(id, user.id);
      if (!space) throw new HttpError(404, "Space not found");
      res.json({ space });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/admin/spaces/:id/reset-link", async (req, res) => {
    try {
      const user = await deps.authenticateAdmin(req);
      const id = parseSpaceId(req.params.id);
      const existing = await deps.findSpaceByIdAndOwner(id, user.id);
      if (!existing) throw new HttpError(404, "Space not found");
      const token = generateShareToken();
      const updated = await deps.updateSpaceByOwner(id, user.id, { shareTokenHash: hashShareToken(token) });
      if (!updated) throw new HttpError(404, "Space not found");
      res.json({ shareUrl: shareUrl(token) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete("/api/admin/spaces/:id", async (req, res) => {
    try {
      const user = await deps.authenticateAdmin(req);
      const id = parseSpaceId(req.params.id);
      const updated = await deps.updateSpaceByOwner(id, user.id, { status: "archived" });
      if (!updated) throw new HttpError(404, "Space not found");
      res.json({ ok: true });
    } catch (error) {
      sendError(res, error);
    }
  });
}
