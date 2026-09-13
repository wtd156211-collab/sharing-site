import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { spaces, type InsertSpace, type Space } from "../../drizzle/schema";

function requireDb() {
  return getDb().then(db => {
    if (!db) throw new Error("Database is not configured");
    return db;
  });
}

export function toPublicSpace(space: Space) {
  return {
    id: space.id,
    ownerId: space.ownerId,
    name: space.name,
    description: space.description,
    allowComments: Boolean(space.allowComments),
    status: space.status,
    expiresAt: space.expiresAt,
    lastActivityAt: space.lastActivityAt,
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
  };
}

export async function listSpacesByOwner(ownerId: number) {
  const db = await requireDb();
  const rows = await db.select().from(spaces).where(eq(spaces.ownerId, ownerId)).orderBy(desc(spaces.updatedAt));
  return rows.map(toPublicSpace);
}

export async function findSpaceById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(spaces).where(eq(spaces.id, id)).limit(1);
  return rows[0] ? toPublicSpace(rows[0]) : null;
}

export async function findSpaceByIdAndOwner(id: number, ownerId: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(spaces)
    .where(and(eq(spaces.id, id), eq(spaces.ownerId, ownerId)))
    .limit(1);
  return rows[0] ? toPublicSpace(rows[0]) : null;
}

export async function findSpaceRecordByTokenHash(tokenHash: string) {
  const db = await requireDb();
  const rows = await db.select().from(spaces).where(eq(spaces.shareTokenHash, tokenHash)).limit(1);
  return rows[0] ?? null;
}

export async function insertSpace(values: InsertSpace) {
  const db = await requireDb();
  const result = await db.insert(spaces).values(values);
  return Number(result[0].insertId);
}

export async function updateSpaceByOwner(
  id: number,
  ownerId: number,
  values: Partial<Pick<InsertSpace, "name" | "description" | "allowComments" | "status" | "expiresAt" | "shareTokenHash" | "passwordHash">>,
) {
  const db = await requireDb();
  const result = await db
    .update(spaces)
    .set(values)
    .where(and(eq(spaces.id, id), eq(spaces.ownerId, ownerId)));
  return result[0].affectedRows > 0;
}
