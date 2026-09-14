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

  it("derives folder labels and counts from note types", () => {
    const dashboard = readFileSync(
      path.resolve(import.meta.dirname, "../../client/src/pages/AdminDashboard.tsx"),
      "utf8",
    );
    expect(dashboard).toContain("文字笔记");
    expect(dashboard).toContain("图片笔记");
    expect(dashboard).toContain("notes.length");
    expect(dashboard).toContain("groupNotesByType");
  });
});
