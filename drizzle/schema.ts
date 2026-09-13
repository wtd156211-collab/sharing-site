import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const spaces = mysqlTable(
  "spaces",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    shareTokenHash: varchar("shareTokenHash", { length: 128 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }),
    allowComments: int("allowComments").notNull().default(1),
    status: mysqlEnum("status", ["active", "paused", "archived"]).notNull().default("active"),
    expiresAt: timestamp("expiresAt"),
    lastActivityAt: timestamp("lastActivityAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    ownerIdx: index("spaces_owner_idx").on(table.ownerId),
    tokenIdx: uniqueIndex("spaces_token_hash_idx").on(table.shareTokenHash),
  }),
);

export type Space = typeof spaces.$inferSelect;
export type InsertSpace = typeof spaces.$inferInsert;

export const entries = mysqlTable(
  "entries",
  {
    id: int("id").autoincrement().primaryKey(),
    spaceId: int("spaceId").notNull(),
    authorId: int("authorId"),
    entryType: mysqlEnum("entryType", ["text", "image", "system"]).notNull(),
    textContent: text("textContent"),
    replyToEntryId: int("replyToEntryId"),
    visibility: mysqlEnum("visibility", ["visible", "hidden", "deleted"]).notNull().default("visible"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    spaceCreatedIdx: index("entries_space_created_idx").on(table.spaceId, table.createdAt),
  }),
);

export type Entry = typeof entries.$inferSelect;
export type InsertEntry = typeof entries.$inferInsert;

export const attachments = mysqlTable(
  "attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    entryId: int("entryId").notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    thumbnailKey: varchar("thumbnailKey", { length: 512 }),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }).notNull(),
    fileSize: int("fileSize").notNull(),
    width: int("width"),
    height: int("height"),
    checksum: varchar("checksum", { length: 128 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    entryIdx: index("attachments_entry_idx").on(table.entryId),
    checksumIdx: index("attachments_checksum_idx").on(table.checksum),
  }),
);

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;

export const comments = mysqlTable(
  "comments",
  {
    id: int("id").autoincrement().primaryKey(),
    spaceId: int("spaceId").notNull(),
    entryId: int("entryId"),
    nickname: varchar("nickname", { length: 80 }).notNull(),
    content: text("content").notNull(),
    replyToCommentId: int("replyToCommentId"),
    status: mysqlEnum("status", ["visible", "hidden", "deleted"]).notNull().default("visible"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    spaceCreatedIdx: index("comments_space_created_idx").on(table.spaceId, table.createdAt),
  }),
);

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

export const accessLogs = mysqlTable(
  "accessLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    spaceId: int("spaceId").notNull(),
    eventType: varchar("eventType", { length: 40 }).notNull(),
    ipHash: varchar("ipHash", { length: 128 }),
    userAgentSummary: varchar("userAgentSummary", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    spaceCreatedIdx: index("access_logs_space_created_idx").on(table.spaceId, table.createdAt),
  }),
);

export const spaceEvents = mysqlTable(
  "spaceEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    spaceId: int("spaceId").notNull(),
    eventType: varchar("eventType", { length: 40 }).notNull(),
    entityId: int("entityId"),
    payloadJson: text("payloadJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    spaceIdIdx: index("space_events_space_id_idx").on(table.spaceId, table.id),
  }),
);

export type SpaceEvent = typeof spaceEvents.$inferSelect;
export type InsertSpaceEvent = typeof spaceEvents.$inferInsert;
