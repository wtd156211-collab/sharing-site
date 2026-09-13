import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(import.meta.dirname, "../../client/src/index.css"), "utf8");

describe("responsive Material 3 floor", () => {
  it("prevents horizontal overflow and protects mobile grids", () => {
    expect(css).toContain("overflow-x: clip");
    expect(css).toContain("minmax(0, 1fr)");
    expect(css).toContain("min-width: 0");
  });

  it("keeps touch controls and focus states visible", () => {
    expect(css).toMatch(/min-height:\s*44px/);
    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("collapses the overview strip on narrow screens", () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*\.overview-strip\s*\{[^}]*display:\s*block/);
  });
});
