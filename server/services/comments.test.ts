import { describe, expect, it } from "vitest";
import { validateCommentInput } from "./comments";

describe("comment validation", () => {
  it("trims valid plain-text comments", () => {
    expect(validateCommentInput({ nickname: " 妈妈 ", content: "  看得很清楚  " })).toEqual({ nickname: "妈妈", content: "看得很清楚" });
  });

  it("rejects empty and overlong comments", () => {
    expect(() => validateCommentInput({ nickname: "", content: "hello" })).toThrow();
    expect(() => validateCommentInput({ nickname: "家人", content: "x".repeat(2001) })).toThrow();
  });
});
