import { describe, expect, it } from "vitest";
import { attachments, comments, entries, spaceEvents, spaces } from "../drizzle/schema";

describe("MySQL domain schema", () => {
  it("exports the tables required by the sharing workflow", () => {
    expect(spaces).toBeDefined();
    expect(entries).toBeDefined();
    expect(attachments).toBeDefined();
    expect(comments).toBeDefined();
    expect(spaceEvents).toBeDefined();
  });
});
