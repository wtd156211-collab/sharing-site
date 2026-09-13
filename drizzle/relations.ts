import { relations } from "drizzle-orm";
import { attachments, comments, entries, spaceEvents, spaces, users } from "./schema";

export const userRelations = relations(users, ({ many }) => ({
  spaces: many(spaces),
  entries: many(entries),
}));

export const spaceRelations = relations(spaces, ({ many, one }) => ({
  owner: one(users, { fields: [spaces.ownerId], references: [users.id] }),
  entries: many(entries),
  comments: many(comments),
  events: many(spaceEvents),
}));

export const entryRelations = relations(entries, ({ many, one }) => ({
  space: one(spaces, { fields: [entries.spaceId], references: [spaces.id] }),
  author: one(users, { fields: [entries.authorId], references: [users.id] }),
  attachments: many(attachments),
}));

export const attachmentRelations = relations(attachments, ({ one }) => ({
  entry: one(entries, { fields: [attachments.entryId], references: [entries.id] }),
}));

export const commentRelations = relations(comments, ({ one }) => ({
  space: one(spaces, { fields: [comments.spaceId], references: [spaces.id] }),
  entry: one(entries, { fields: [comments.entryId], references: [entries.id] }),
}));

export const spaceEventRelations = relations(spaceEvents, ({ one }) => ({
  space: one(spaces, { fields: [spaceEvents.spaceId], references: [spaces.id] }),
}));
