import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(path.resolve(import.meta.dirname, "../../client/src/pages/AdminDashboard.tsx"), "utf8");

describe("dashboard truthful states", () => {
  it("does not ship the old fake overview counters", () => {
    expect(dashboard).not.toContain("<strong>24</strong>");
    expect(dashboard).not.toContain("<strong>6</strong>");
    expect(dashboard).not.toContain("<strong>12</strong>");
  });

  it("exposes accessible live feedback", () => {
    expect(dashboard).toContain('aria-live="polite"');
  });
});
