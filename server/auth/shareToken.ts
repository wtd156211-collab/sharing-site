import { createHash, randomBytes } from "node:crypto";

const SHARE_TOKEN_BYTES = 32;

/** Generate a high-entropy token suitable for embedding in a share URL. */
export function generateShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
}

/** Hash a share token before persistence or lookup; raw tokens are never stored. */
export function hashShareToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
