import { describe, expect, it } from "vitest";
import { isAdminUser, toPublicAdminUser } from "./admin";

describe("admin authorization", () => {
  it("accepts only admin role users", () => {
    expect(isAdminUser({ role: "admin" })).toBe(true);
    expect(isAdminUser({ role: "user" })).toBe(false);
    expect(isAdminUser(null)).toBe(false);
  });

  it("does not expose session or credential fields", () => {
    expect(toPublicAdminUser({ id: 1, name: "小满", email: "a@example.com", role: "admin" })).toEqual({
      id: 1,
      name: "小满",
      email: "a@example.com",
      role: "admin",
    });
  });
});
