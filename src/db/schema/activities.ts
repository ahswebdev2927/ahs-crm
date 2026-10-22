import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { leads } from "./leads";
import { customers } from "./customers";

export const activityCategoryEnum = ['communication', 'lifecycle', 'commercial'] as const;
export type ActivityCategoryDB = typeof activityCategoryEnum[number];

export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(), // UUID
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: text('category', { enum: activityCategoryEnum }).notNull().default('communication'),
  type: text('type').notNull(), // e.g. "note", "call", "stage_change", "appointment", "visit", "quotation", "invoice", "payment"
  subject: text('subject').notNull(),
  description: text('description'),
  outcome: text('outcome'), // e.g. "connected", "left_message", "held", "sent"
  metadata: text('metadata'), // JSON context payload
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }), // Soft-delete for manual entries
}, (t) => [
  index('activities_lead_id_idx').on(t.leadId),
  index('activities_customer_id_idx').on(t.customerId),
  index('activities_user_id_idx').on(t.userId),
  index('activities_category_idx').on(t.category),
  index('activities_type_idx').on(t.type),
  index('activities_created_at_idx').on(t.createdAt),
  index('activities_deleted_at_idx').on(t.deletedAt),
  index('activities_lead_cat_idx').on(t.leadId, t.category, t.createdAt),
  index('activities_customer_cat_idx').on(t.customerId, t.category, t.createdAt),
]);

// Relational Definitions
export const activitiesRelations = relations(activities, ({ one }) => ({
  lead: one(leads, {
    fields: [activities.leadId],
    references: [leads.id],
  }),
  customer: one(customers, {
    fields: [activities.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
