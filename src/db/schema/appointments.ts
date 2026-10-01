import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { leads } from "./leads";
import { customers } from "./customers";

export const followUps = sqliteTable('follow_ups', {
  id: text('id').primaryKey(), // UUID
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }).notNull(),
  type: text('type', { enum: ['call', 'meeting', 'whatsapp', 'email', 'site_visit', 'other'] }).notNull().default('call'),
  notes: text('notes'),
  outcome: text('outcome'),
  status: text('status', { enum: ['scheduled', 'completed', 'rescheduled', 'cancelled', 'missed'] }).notNull().default('scheduled'),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  createdById: text('created_by_id').notNull().references(() => users.id),
  assignedToId: text('assigned_to_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('follow_ups_lead_id_idx').on(t.leadId),
  index('follow_ups_customer_id_idx').on(t.customerId),
  index('follow_ups_assigned_to_id_idx').on(t.assignedToId),
  index('follow_ups_scheduled_at_idx').on(t.scheduledAt),
  index('follow_ups_status_idx').on(t.status),
]);

export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(), // UUID
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  startTime: integer('start_time', { mode: 'timestamp_ms' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp_ms' }).notNull(),
  location: text('location'),
  status: text('status', { enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'rescheduled', 'cancelled', 'no_show'] }).notNull().default('scheduled'),
  rescheduleReason: text('reschedule_reason'),
  cancellationReason: text('cancellation_reason'),
  createdById: text('created_by_id').notNull().references(() => users.id),
  assignedToId: text('assigned_to_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('appointments_lead_id_idx').on(t.leadId),
  index('appointments_customer_id_idx').on(t.customerId),
  index('appointments_assigned_to_id_idx').on(t.assignedToId),
  index('appointments_start_time_idx').on(t.startTime),
  index('appointments_status_idx').on(t.status),
]);

export const fieldVisits = sqliteTable('field_visits', {
  id: text('id').primaryKey(), // UUID
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  appointmentId: text('appointment_id').references(() => appointments.id, { onDelete: 'cascade' }).unique(),
  visitDate: integer('visit_date', { mode: 'timestamp_ms' }).notNull(),
  purpose: text('purpose').notNull(),
  summary: text('summary'),
  outcome: text('outcome'),
  feedback: text('feedback'),
  requirements: text('requirements'),
  nextAction: text('next_action', { enum: ['follow_up', 'proposal', 'second_visit', 'negotiation', 'won', 'lost'] }),
  nextActionDate: integer('next_action_date', { mode: 'timestamp_ms' }),
  expenses: integer('expenses').notNull().default(0),
  status: text('status', { enum: ['scheduled', 'completed', 'cancelled'] }).notNull().default('scheduled'),
  createdById: text('created_by_id').notNull().references(() => users.id),
  assignedToId: text('assigned_to_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('field_visits_lead_id_idx').on(t.leadId),
  index('field_visits_customer_id_idx').on(t.customerId),
  index('field_visits_appointment_id_idx').on(t.appointmentId),
  index('field_visits_assigned_to_id_idx').on(t.assignedToId),
  index('field_visits_status_idx').on(t.status),
  index('field_visits_visit_date_idx').on(t.visitDate),
]);

export const fieldVisitMedia = sqliteTable('field_visit_media', {
  id: text('id').primaryKey(), // UUID
  fieldVisitId: text('field_visit_id').notNull().references(() => fieldVisits.id, { onDelete: 'cascade' }),
  cloudinaryPublicId: text('cloudinary_public_id').notNull(),
  cloudinaryUrl: text('cloudinary_url').notNull(),
  resourceType: text('resource_type', { enum: ['image', 'document'] }).notNull().default('image'),
  caption: text('caption'),
  uploadedById: text('uploaded_by_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('field_visit_media_visit_id_idx').on(t.fieldVisitId),
  index('field_visit_media_uploaded_by_id_idx').on(t.uploadedById),
]);

// Relational Definitions
export const followUpsRelations = relations(followUps, ({ one }) => ({
  lead: one(leads, {
    fields: [followUps.leadId],
    references: [leads.id],
  }),
  customer: one(customers, {
    fields: [followUps.customerId],
    references: [customers.id],
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

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  lead: one(leads, {
    fields: [appointments.leadId],
    references: [leads.id],
  }),
  customer: one(customers, {
    fields: [appointments.customerId],
    references: [customers.id],
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
  fieldVisit: one(fieldVisits),
}));

export const fieldVisitsRelations = relations(fieldVisits, ({ one, many }) => ({
  lead: one(leads, {
    fields: [fieldVisits.leadId],
    references: [leads.id],
  }),
  customer: one(customers, {
    fields: [fieldVisits.customerId],
    references: [customers.id],
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
  media: many(fieldVisitMedia),
}));

export const fieldVisitMediaRelations = relations(fieldVisitMedia, ({ one }) => ({
  fieldVisit: one(fieldVisits, {
    fields: [fieldVisitMedia.fieldVisitId],
    references: [fieldVisits.id],
  }),
  uploadedBy: one(users, {
    fields: [fieldVisitMedia.uploadedById],
    references: [users.id],
    relationName: 'fieldVisitMediaUploader',
  }),
}));
