import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  path.resolve(import.meta.dirname, "../../client/src/index.css"),
  "utf8",
);

describe("desktop side rail layout", () => {
  it("keeps the navigation rail in the viewport while main content scrolls", () => {
    const sideRailRule = stylesheet.match(/\.side-rail\s*\{([^}]*)\}/)?.[1];

    expect(sideRailRule).toContain("position: sticky");
    expect(sideRailRule).toContain("top: 0");
    expect(sideRailRule).toMatch(/height:\s*100dvh/);
  });
});
