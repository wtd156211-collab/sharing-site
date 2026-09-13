import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { attachments, type Attachment, type InsertAttachment } from "../../drizzle/schema";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db;
}

export async function insertAttachment(values: InsertAttachment) {
  const db = await requireDb();
  const result = await db.insert(attachments).values(values);
  return Number(result[0].insertId);
}

export async function findAttachmentByEntryId(entryId: number): Promise<Attachment | null> {
  const db = await requireDb();
  const rows = await db.select().from(attachments).where(eq(attachments.entryId, entryId)).limit(1);
  return rows[0] ?? null;
}
