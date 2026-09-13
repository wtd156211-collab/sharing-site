import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { comments, type InsertComment } from "../../drizzle/schema";

function requireDb() {
  return getDb().then(db => {
    if (!db) throw new Error("Database is not configured");
    return db;
  });
}

export async function listVisibleComments(spaceId: number, entryId?: number) {
  const db = await requireDb();
  const filters = [eq(comments.spaceId, spaceId), eq(comments.status, "visible" as const)];
  if (entryId !== undefined) filters.push(eq(comments.entryId, entryId));
  return db.select().from(comments).where(and(...filters)).orderBy(desc(comments.createdAt), desc(comments.id));
}

export async function insertComment(values: InsertComment) {
  const db = await requireDb();
  const result = await db.insert(comments).values(values);
  return Number(result[0].insertId);
}
