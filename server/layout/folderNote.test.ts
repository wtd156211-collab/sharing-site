import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.resolve(import.meta.dirname, "../../client/src/components/Folder.tsx"),
  "utf8",
);

describe("original folder component contract", () => {
  it("keeps the supplied SVG path and motion/react API", () => {
    expect(source).toContain("M0 25C0 11.1929");
    expect(source).toContain('from "motion/react"');
    expect(source).toContain("rotateX");
  });
});
