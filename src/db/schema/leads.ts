import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const leadStages = sqliteTable('lead_stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  color: text('color').notNull().default('#6b7280'),
  order: integer('order').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
});

export const leads = sqliteTable('leads', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  company: text('company'),
  phone: text('phone'),
  email: text('email'),
  source: text('source'),
  requirements: text('requirements'),
  notes: text('notes'),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] }).notNull().default('medium'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  createdById: text('created_by_id').notNull().references(() => users.id),
  stageId: integer('stage_id').notNull().references(() => leadStages.id),
  status: text('status', { enum: ['active', 'archived', 'deleted'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
}, (t) => [
  index('leads_owner_id_idx').on(t.ownerId),
  index('leads_stage_id_idx').on(t.stageId),
  index('leads_status_idx').on(t.status),
]);

export const leadStageHistory = sqliteTable('lead_stage_history', {
  id: text('id').primaryKey(), // UUID
  leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  fromStageId: integer('from_stage_id').references(() => leadStages.id, { onDelete: 'set null' }),
  toStageId: integer('to_stage_id').notNull().references(() => leadStages.id),
  changedById: text('changed_by_id').notNull().references(() => users.id),
  reason: text('reason'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('lead_history_lead_id_idx').on(t.leadId),
]);

export const leadPartners = sqliteTable('lead_partners', {
  id: text('id').primaryKey(), // UUID
  leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  partnerId: text('partner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  percentage: integer('percentage').notNull().default(0),
  role: text('role', { enum: ['co_owner', 'collaborator', 'referral', 'technical_sales'] }).notNull().default('collaborator'),
  status: text('status', { enum: ['active', 'removed'] }).notNull().default('active'),
  addedById: text('added_by_id').references(() => users.id, { onDelete: 'set null' }),
  removedById: text('removed_by_id').references(() => users.id, { onDelete: 'set null' }),
  removalReason: text('removal_reason'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  removedAt: integer('removed_at', { mode: 'timestamp_ms' }),
}, (t) => [
  index('lead_partners_lead_id_idx').on(t.leadId),
  index('lead_partners_partner_id_idx').on(t.partnerId),
  index('lead_partners_status_idx').on(t.status),
]);

// Relational Definitions
export const leadStagesRelations = relations(leadStages, ({ many }) => ({
  leads: many(leads),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  stage: one(leadStages, {
    fields: [leads.stageId],
    references: [leadStages.id],
  }),
  owner: one(users, {
    fields: [leads.ownerId],
    references: [users.id],
    relationName: 'leadsOwner',
  }),
  createdBy: one(users, {
    fields: [leads.createdById],
    references: [users.id],
    relationName: 'leadsCreator',
  }),
  stageHistory: many(leadStageHistory),
  partners: many(leadPartners),
}));

export const leadStageHistoryRelations = relations(leadStageHistory, ({ one }) => ({
  lead: one(leads, {
    fields: [leadStageHistory.leadId],
    references: [leads.id],
  }),
  fromStage: one(leadStages, {
    fields: [leadStageHistory.fromStageId],
    references: [leadStages.id],
    relationName: 'historyFromStage',
  }),
  toStage: one(leadStages, {
    fields: [leadStageHistory.toStageId],
    references: [leadStages.id],
    relationName: 'historyToStage',
  }),
  changedBy: one(users, {
    fields: [leadStageHistory.changedById],
    references: [users.id],
  }),
}));

export const leadPartnersRelations = relations(leadPartners, ({ one }) => ({
  lead: one(leads, {
    fields: [leadPartners.leadId],
    references: [leads.id],
  }),
  partner: one(users, {
    fields: [leadPartners.partnerId],
    references: [users.id],
    relationName: 'leadPartnerUser',
  }),
  addedBy: one(users, {
    fields: [leadPartners.addedById],
    references: [users.id],
    relationName: 'leadPartnerAddedBy',
  }),
  removedBy: one(users, {
    fields: [leadPartners.removedById],
    references: [users.id],
    relationName: 'leadPartnerRemovedBy',
  }),
}));
