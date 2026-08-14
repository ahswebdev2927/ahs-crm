import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { leads } from "./leads";
import { customers } from "./customers";
import { tasks } from "./tasks";

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  url: text('url').notNull(),
  publicId: text('public_id').notNull(),
  fileSize: integer('file_size').notNull(), // size in bytes
  mimeType: text('mime_type'),
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  uploadedById: text('uploaded_by_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('attachments_lead_id_idx').on(t.leadId),
  index('attachments_customer_id_idx').on(t.customerId),
  index('attachments_task_id_idx').on(t.taskId),
]);

// Relational Definitions
export const attachmentsRelations = relations(attachments, ({ one }) => ({
  lead: one(leads, {
    fields: [attachments.leadId],
    references: [leads.id],
  }),
  customer: one(customers, {
    fields: [attachments.customerId],
    references: [customers.id],
  }),
  task: one(tasks, {
    fields: [attachments.taskId],
    references: [tasks.id],
  }),
  uploadedBy: one(users, {
    fields: [attachments.uploadedById],
    references: [users.id],
  }),
}));
