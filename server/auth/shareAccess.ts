import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import * as cookie from "cookie";
import { jwtVerify, SignJWT } from "jose";
import type { Request, Response } from "express";
import type { Space } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { hashShareToken } from "./shareToken";

const scrypt = promisify(nodeScrypt);
export const SHARE_ACCESS_COOKIE = "family_share_access";
const SHARE_ACCESS_TTL_SECONDS = 60 * 60 * 12;
const PASSWORD_PREFIX = "scrypt$";

export type ShareAccessSession = { spaceId: number };
export type ShareAccessState = "public" | "password" | "expired" | "inactive";

export function isShareTokenFormat(token: string): boolean {
  return /^[A-Za-z0-9_-]{43,128}$/.test(token);
}

export function getShareAccessState(
  space: Pick<Space, "status" | "expiresAt" | "passwordHash">,
  now: Date,
): ShareAccessState {
  if (space.status !== "active") return "inactive";
  if (space.expiresAt && space.expiresAt.getTime() <= now.getTime()) return "expired";
  return space.passwordHash ? "password" : "public";
}

function secretKey() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createShareAccessSession(spaceId: number): Promise<string> {
  return new SignJWT({ kind: "share_access", spaceId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${SHARE_ACCESS_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyShareAccessSession(token: string | null | undefined): Promise<ShareAccessSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.kind !== "share_access" || typeof payload.spaceId !== "number" || !Number.isSafeInteger(payload.spaceId) || payload.spaceId <= 0) return null;
    return { spaceId: payload.spaceId };
  } catch {
    return null;
  }
}

export async function hashSharePassword(password: string): Promise<string> {
  if (!password) throw new Error("Share password is required");
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${PASSWORD_PREFIX}${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifySharePassword(password: string, encoded: string): Promise<boolean> {
  const [prefix, saltEncoded, hashEncoded] = encoded.split("$");
  if (prefix !== "scrypt" || !saltEncoded || !hashEncoded) return false;
  try {
    const salt = Buffer.from(saltEncoded, "base64url");
    const expected = Buffer.from(hashEncoded, "base64url");
    if (salt.length < 8 || salt.length > 64 || expected.length < 16 || expected.length > 128) return false;
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function readShareAccessCookie(req: Request): string | null {
  const cookies = cookie.parse(req.headers.cookie ?? "");
  return cookies[SHARE_ACCESS_COOKIE] ?? null;
}

export function setShareAccessCookie(res: Response, token: string) {
  const attributes = [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SHARE_ACCESS_TTL_SECONDS}`,
  ];
  if (ENV.isProduction) attributes.push("Secure");
  res.setHeader("Set-Cookie", `${SHARE_ACCESS_COOKIE}=${encodeURIComponent(token)}; ${attributes.join("; ")}`);
}

export function hashShareTokenForLookup(token: string): string {
  return hashShareToken(token);
}
