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
  category: text('category').notNull().default('system'), // 'leads' | 'appointments' | 'tasks' | 'financials' | 'customers' | 'system'
  referenceId: text('reference_id'),
  actionUrl: text('action_url'), // Direct CRM path for deep linking, e.g. "/leads/123"
  isRead: integer('is_read').notNull().default(0), // 0 for false, 1 for true
  readAt: integer('read_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('notifications_recipient_id_idx').on(t.recipientId),
  index('notifications_is_read_idx').on(t.isRead),
  index('notifications_category_idx').on(t.category),
  index('notifications_created_at_idx').on(t.createdAt),
]);

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(), // Public encryption key
  auth: text('auth').notNull(),     // Authentication secret
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('push_subscriptions_user_id_idx').on(t.userId),
  index('push_subscriptions_endpoint_idx').on(t.endpoint),
]);

export const notificationPreferences = sqliteTable('notification_preferences', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(), // 'in_app' | 'push' | 'sound' | 'email' | 'whatsapp'
  type: text('type').notNull(),       // category or specific type ('leads', 'appointments', 'tasks', 'financials', etc.)
  enabled: integer('enabled').notNull().default(1), // 0 for disabled, 1 for enabled
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  primaryKey({ columns: [t.userId, t.channel, t.type] }),
  index('notification_preferences_user_id_idx').on(t.userId),
]);

// Relational Definitions
export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
  }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type PushSubscriptionRecord = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionRecord = typeof pushSubscriptions.$inferInsert;

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
