import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createLocalStorage } from "./local";

describe("local storage adapter", () => {
  it("writes and removes objects below the configured upload directory", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "family-notes-storage-"));
    const storage = createLocalStorage(root, "/uploads");

    const saved = await storage.put("spaces/1/note.txt", Buffer.from("hello"), "text/plain");
    expect(saved.key).toBe("spaces/1/note.txt");
    expect(saved.url).toBe("/uploads/spaces/1/note.txt");
    await expect(readFile(path.join(root, "spaces/1/note.txt"), "utf8")).resolves.toBe("hello");

    expect(await storage.getSignedUrl(saved.key)).toBe(saved.url);
    await storage.delete(saved.key);
    await expect(readFile(path.join(root, "spaces/1/note.txt"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects path traversal keys", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "family-notes-storage-"));
    const storage = createLocalStorage(root, "/uploads");

    await expect(storage.put("../outside.txt", Buffer.from("blocked"))).rejects.toThrow(/invalid storage key/i);
  });
});
