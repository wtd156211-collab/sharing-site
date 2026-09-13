import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { comments, type Comment, type InsertComment } from "../../drizzle/schema";

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

export async function findCommentById(id: number): Promise<Comment | null> {
  const db = await requireDb();
  const rows = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateCommentStatus(id: number, spaceId: number, status: "hidden" | "deleted") {
  const db = await requireDb();
  const result = await db.update(comments).set({ status }).where(and(eq(comments.id, id), eq(comments.spaceId, spaceId)));
  return result[0].affectedRows > 0;
}
