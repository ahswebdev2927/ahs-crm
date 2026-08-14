import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(), // UUID
  recipientId: text('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  referenceId: text('reference_id'),
  isRead: integer('is_read').notNull().default(0), // 0 for false, 1 for true
  readAt: integer('read_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('notifications_recipient_id_idx').on(t.recipientId),
  index('notifications_is_read_idx').on(t.isRead),
]);

export const notificationPreferences = sqliteTable('notification_preferences', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(),
  type: text('type').notNull(),
  enabled: integer('enabled').notNull().default(1), // 0 for disabled, 1 for enabled
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  primaryKey({ columns: [t.userId, t.channel, t.type] }),
]);

// Relational Definitions
export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));
