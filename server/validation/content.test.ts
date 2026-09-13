import { describe, expect, it } from "vitest";
import { validateTextEntryInput } from "./content";

describe("content validation", () => {
  it("trims text entries and rejects blank content", () => {
    expect(validateTextEntryInput({ text: "  今天很开心  " })).toEqual({ text: "今天很开心" });
    expect(() => validateTextEntryInput({ text: "   " })).toThrow();
  });
});
