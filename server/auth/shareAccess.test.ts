import { describe, expect, it } from "vitest";
import { getShareAccessState, hashSharePassword, isShareTokenFormat, verifySharePassword } from "./shareAccess";

describe("share access policy", () => {
  it("accepts only high-entropy URL-safe token shapes", () => {
    expect(isShareTokenFormat("a".repeat(43))).toBe(true);
    expect(isShareTokenFormat("short-token")).toBe(false);
    expect(isShareTokenFormat("a".repeat(42) + "+")).toBe(false);
  });

  it("distinguishes active, password-protected, expired and inactive spaces", () => {
    const active = { status: "active" as const, expiresAt: null, passwordHash: null };
    expect(getShareAccessState(active, new Date())).toBe("public");
    expect(getShareAccessState({ ...active, passwordHash: "hash" }, new Date())).toBe("password");
    expect(getShareAccessState({ ...active, expiresAt: new Date(Date.now() - 1000) }, new Date())).toBe("expired");
    expect(getShareAccessState({ ...active, status: "paused" as const }, new Date())).toBe("inactive");
  });

  it("hashes share passwords and rejects incorrect values", async () => {
    const encoded = await hashSharePassword("family-secret");
    expect(encoded).not.toContain("family-secret");
    expect(await verifySharePassword("family-secret", encoded)).toBe(true);
    expect(await verifySharePassword("wrong", encoded)).toBe(false);
  });
});
