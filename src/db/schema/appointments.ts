import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { leads } from "./leads";

export const followUps = sqliteTable('follow_ups', {
  id: text('id').primaryKey(), // UUID
  leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }).notNull(),
  type: text('type').notNull().default('call'),
  notes: text('notes'),
  status: text('status', { enum: ['pending', 'completed', 'cancelled', 'no_show'] }).notNull().default('pending'),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  createdById: text('created_by_id').notNull().references(() => users.id),
  assignedToId: text('assigned_to_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('follow_ups_lead_id_idx').on(t.leadId),
  index('follow_ups_assigned_to_id_idx').on(t.assignedToId),
  index('follow_ups_scheduled_at_idx').on(t.scheduledAt),
]);

export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(), // UUID
  leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  startTime: integer('start_time', { mode: 'timestamp_ms' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp_ms' }).notNull(),
  location: text('location'),
  status: text('status', { enum: ['scheduled', 'completed', 'cancelled', 'no_show'] }).notNull().default('scheduled'),
  createdById: text('created_by_id').notNull().references(() => users.id),
  assignedToId: text('assigned_to_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('appointments_lead_id_idx').on(t.leadId),
  index('appointments_assigned_to_id_idx').on(t.assignedToId),
  index('appointments_start_time_idx').on(t.startTime),
]);

export const fieldVisits = sqliteTable('field_visits', {
  id: text('id').primaryKey(), // UUID
  leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  appointmentId: text('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
  visitDate: integer('visit_date', { mode: 'timestamp_ms' }).notNull(),
  purpose: text('purpose').notNull(),
  outcome: text('outcome'),
  feedback: text('feedback'),
  expenses: integer('expenses').notNull().default(0),
  status: text('status', { enum: ['scheduled', 'completed', 'cancelled'] }).notNull().default('scheduled'),
  createdById: text('created_by_id').notNull().references(() => users.id),
  assignedToId: text('assigned_to_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('field_visits_lead_id_idx').on(t.leadId),
  index('field_visits_appointment_id_idx').on(t.appointmentId),
  index('field_visits_assigned_to_id_idx').on(t.assignedToId),
]);

// Relational Definitions
export const followUpsRelations = relations(followUps, ({ one }) => ({
  lead: one(leads, {
    fields: [followUps.leadId],
    references: [leads.id],
  }),
  createdBy: one(users, {
    fields: [followUps.createdById],
    references: [users.id],
    relationName: 'followUpsCreator',
  }),
  assignedTo: one(users, {
    fields: [followUps.assignedToId],
    references: [users.id],
    relationName: 'followUpsAssignee',
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  lead: one(leads, {
    fields: [appointments.leadId],
    references: [leads.id],
  }),
  createdBy: one(users, {
    fields: [appointments.createdById],
    references: [users.id],
    relationName: 'appointmentsCreator',
  }),
  assignedTo: one(users, {
    fields: [appointments.assignedToId],
    references: [users.id],
    relationName: 'appointmentsAssignee',
  }),
  fieldVisits: many(fieldVisits),
}));

export const fieldVisitsRelations = relations(fieldVisits, ({ one }) => ({
  lead: one(leads, {
    fields: [fieldVisits.leadId],
    references: [leads.id],
  }),
  appointment: one(appointments, {
    fields: [fieldVisits.appointmentId],
    references: [appointments.id],
  }),
  createdBy: one(users, {
    fields: [fieldVisits.createdById],
    references: [users.id],
    relationName: 'fieldVisitsCreator',
  }),
  assignedTo: one(users, {
    fields: [fieldVisits.assignedToId],
    references: [users.id],
    relationName: 'fieldVisitsAssignee',
  }),
}));
