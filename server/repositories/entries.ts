import { and, desc, eq, lt } from "drizzle-orm";
import { getDb } from "../db";
import { entries, type InsertEntry } from "../../drizzle/schema";

function requireDb() {
  return getDb().then(db => {
    if (!db) throw new Error("Database is not configured");
    return db;
  });
}

export async function listVisibleEntries(spaceId: number, options: { limit?: number; beforeId?: number } = {}) {
  const db = await requireDb();
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const filters = [eq(entries.spaceId, spaceId), eq(entries.visibility, "visible" as const)];
  if (options.beforeId !== undefined) filters.push(lt(entries.id, options.beforeId));
  return db.select().from(entries).where(and(...filters)).orderBy(desc(entries.createdAt), desc(entries.id)).limit(limit);
}

export async function insertEntry(values: InsertEntry) {
  const db = await requireDb();
  const result = await db.insert(entries).values(values);
  return Number(result[0].insertId);
}
