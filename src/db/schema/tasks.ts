import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { leads } from "./leads";
import { customers } from "./customers";

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(), // UUID
  title: text('title').notNull(),
  description: text('description'),
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  assignedToId: text('assigned_to_id').references(() => users.id, { onDelete: 'set null' }),
  createdById: text('created_by_id').notNull().references(() => users.id),
  dueDate: integer('due_date', { mode: 'timestamp_ms' }),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] }).notNull().default('medium'),
  status: text('status', { enum: ['pending', 'in_progress', 'completed', 'deferred', 'cancelled'] }).notNull().default('pending'),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
}, (t) => [
  index('tasks_lead_id_idx').on(t.leadId),
  index('tasks_customer_id_idx').on(t.customerId),
  index('tasks_assigned_to_id_idx').on(t.assignedToId),
  index('tasks_status_idx').on(t.status),
]);

export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(), // UUID
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(), // e.g. "note", "call", "stage_change", "appointment", "visit", "quotation", "invoice", "payment"
  subject: text('subject').notNull(),
  description: text('description'),
  metadata: text('metadata'), // JSON context payload
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('activities_lead_id_idx').on(t.leadId),
  index('activities_customer_id_idx').on(t.customerId),
  index('activities_user_id_idx').on(t.userId),
]);

export const taskTodos = sqliteTable('task_todos', {
  id: text('id').primaryKey(), // UUID
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  position: integer('position').notNull().default(0),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  completedById: text('completed_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('task_todos_task_id_idx').on(t.taskId),
  index('task_todos_position_idx').on(t.position),
]);

export const taskNotes = sqliteTable('task_notes', {
  id: text('id').primaryKey(), // UUID
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('task_notes_task_id_idx').on(t.taskId),
  index('task_notes_user_id_idx').on(t.userId),
]);

// Relational Definitions
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  lead: one(leads, {
    fields: [tasks.leadId],
    references: [leads.id],
  }),
  customer: one(customers, {
    fields: [tasks.customerId],
    references: [customers.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
    relationName: 'tasksAssignee',
  }),
  createdBy: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
    relationName: 'tasksCreator',
  }),
  todos: many(taskTodos),
  notes: many(taskNotes),
}));

export const taskTodosRelations = relations(taskTodos, ({ one }) => ({
  task: one(tasks, {
    fields: [taskTodos.taskId],
    references: [tasks.id],
  }),
  completedBy: one(users, {
    fields: [taskTodos.completedById],
    references: [users.id],
  }),
}));

export const taskNotesRelations = relations(taskNotes, ({ one }) => ({
  task: one(tasks, {
    fields: [taskNotes.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskNotes.userId],
    references: [users.id],
  }),
}));

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
