import { describe, expect, it } from "vitest";
import { generateShareToken, hashShareToken } from "./shareToken";

describe("share tokens", () => {
  it("generates high entropy URL-safe tokens and one-way hashes", () => {
    const token = generateShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(hashShareToken(token)).toHaveLength(64);
    expect(hashShareToken(token)).toBe(hashShareToken(token));
    expect(hashShareToken(token)).not.toBe(hashShareToken(generateShareToken()));
  });
});
