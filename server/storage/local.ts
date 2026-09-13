import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageAdapter } from "./types";

function safePath(root: string, key: string) {
  const normalizedKey = key.replace(/\\/g, "/").replace(/^\/+/, "");
  const rootPath = path.resolve(root);
  const target = path.resolve(rootPath, normalizedKey);
  if (target !== rootPath && !target.startsWith(`${rootPath}${path.sep}`)) {
    throw new Error("Invalid storage key");
  }
  return { key: normalizedKey, target };
}

export function createLocalStorage(root: string, publicBase = "/uploads"): StorageAdapter {
  return {
    async put(key, data) {
      const safe = safePath(root, key);
      await mkdir(path.dirname(safe.target), { recursive: true });
      await writeFile(safe.target, data);
      return { key: safe.key, url: `${publicBase.replace(/\/$/, "")}/${safe.key}` };
    },
    async getSignedUrl(key) {
      const safe = safePath(root, key);
      return `${publicBase.replace(/\/$/, "")}/${safe.key}`;
    },
    async delete(key) {
      const safe = safePath(root, key);
      await rm(safe.target, { force: true });
    },
  };
}
