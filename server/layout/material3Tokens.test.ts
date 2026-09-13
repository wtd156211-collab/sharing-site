import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(import.meta.dirname, "../../client/src/index.css"), "utf8");

describe("Material 3 design tokens", () => {
  it("defines the single cool-slate and cobalt palette", () => {
    expect(css).toContain("--primary: #2D5BD8");
    expect(css).toContain("--page: #ECEFF3");
    expect(css).toContain("--surface: #FBFCFE");
    expect(css).toContain("--radius-card: 16px");
    expect(css).toContain("--radius-control: 12px");
  });

  it("does not use pure white or black as global page tokens", () => {
    expect(css).not.toMatch(/--(?:page|surface|ink-[123]):\s*#(?:fff|ffffff|000|000000)\b/i);
  });
});
