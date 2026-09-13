import { and, asc, eq, gt } from "drizzle-orm";
import { getDb } from "../db";
import { spaceEvents, type InsertSpaceEvent } from "../../drizzle/schema";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db;
}

export async function insertSpaceEvent(values: InsertSpaceEvent) {
  const db = await requireDb();
  const result = await db.insert(spaceEvents).values(values);
  return Number(result[0].insertId);
}

export async function listSpaceEventsAfter(spaceId: number, afterEventId: number, limit = 100) {
  const db = await requireDb();
  const rows = await db.select().from(spaceEvents).where(and(eq(spaceEvents.spaceId, spaceId), gt(spaceEvents.id, afterEventId))).orderBy(asc(spaceEvents.id)).limit(Math.min(Math.max(limit, 1), 500));
  return rows;
}
