import { COOKIE_NAME } from "@shared/const";
import { UnauthorizedError, ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import type { AuthenticatedUser } from "../_core/sdk";
import { sdk } from "../_core/sdk";

type UserLike = Pick<AuthenticatedUser, "id" | "name" | "email" | "role">;

export function isAdminUser(user: unknown): user is AuthenticatedUser {
  return Boolean(user && typeof user === "object" && (user as { role?: unknown }).role === "admin");
}

export function toPublicAdminUser(user: UserLike) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function hasSessionCredential(req: Request): boolean {
  const cookieHeader = req.headers.cookie ?? "";
  const hasCookie = cookieHeader.split(";").some(cookie => cookie.trim().startsWith(`${COOKIE_NAME}=`));
  const authorization = req.headers.authorization;
  return hasCookie || (typeof authorization === "string" && authorization.startsWith("Bearer "));
}

/** Authenticate using the existing Manus session and require the admin role. */
export async function authenticateAdmin(req: Request): Promise<AuthenticatedUser> {
  if (!hasSessionCredential(req)) {
    throw UnauthorizedError("Authentication required");
  }

  let user: AuthenticatedUser;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    throw UnauthorizedError("Authentication required");
  }

  if (!isAdminUser(user)) {
    throw ForbiddenError("Admin access required");
  }

  return user;
}
