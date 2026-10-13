import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { leads } from "./leads";

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(), // UUID
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  company: text('company'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
}, (t) => [
  index('customers_owner_id_idx').on(t.ownerId),
  index('customers_lead_id_idx').on(t.leadId),
  index('customers_status_idx').on(t.status),
]);

export const services = sqliteTable('services', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'),
  category: text('category').notNull().default('Digital Marketing Packages'),
  categoryKey: text('category_key').notNull().default('digital-marketing'),
  serviceType: text('service_type').notNull().default('General'),
  plan: text('plan').notNull().default('Standard'),
  billingModel: text('billing_model', { enum: ['monthly', 'one_time'] }).notNull().default('monthly'),
  billingText: text('billing_text').default('+ GST/Month'),
  price: integer('price').notNull(), // base price in cents / paise
  priceText: text('price_text'),
  features: text('features'), // JSON stringified array of deliverable strings
  rawFeatures: text('raw_features'),
  note: text('note'),
  isPopular: integer('is_popular', { mode: 'boolean' }).notNull().default(false),
  externalSourceId: text('external_source_id'),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp_ms' }),
  sortOrder: integer('sort_order').notNull().default(0),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('services_code_idx').on(t.code),
  index('services_category_type_idx').on(t.categoryKey, t.serviceType),
  index('services_status_idx').on(t.status),
]);

export const customerServices = sqliteTable('customer_services', {
  id: text('id').primaryKey(), // UUID
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id').notNull().references(() => services.id),
  // Historical Snapshots (PRD FR-12 / Architecture §25 - never altered by catalog sync)
  serviceNameSnapshot: text('service_name_snapshot').notNull().default(''),
  categorySnapshot: text('category_snapshot').notNull().default(''),
  serviceTypeSnapshot: text('service_type_snapshot').notNull().default(''),
  planSnapshot: text('plan_snapshot').notNull().default(''),
  catalogPriceSnapshot: integer('catalog_price_snapshot').notNull().default(0), // minor units at signup
  billingModel: text('billing_model').notNull().default('monthly'),
  billingText: text('billing_text').default('+ GST/Month'),
  quantity: integer('quantity').notNull().default(1),
  price: integer('price').notNull(), // agreed unit price in cents / paise
  totalPrice: integer('total_price').notNull().default(0), // price * quantity
  notes: text('notes'),
  status: text('status', { enum: ['active', 'suspended', 'cancelled', 'expired'] }).notNull().default('active'),
  startDate: integer('start_date', { mode: 'timestamp_ms' }),
  endDate: integer('end_date', { mode: 'timestamp_ms' }),
  createdById: text('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('customer_services_customer_id_idx').on(t.customerId),
  index('customer_services_service_id_idx').on(t.serviceId),
  index('customer_services_status_idx').on(t.status),
]);

// Relational Definitions
export const customersRelations = relations(customers, ({ one, many }) => ({
  lead: one(leads, {
    fields: [customers.leadId],
    references: [leads.id],
  }),
  owner: one(users, {
    fields: [customers.ownerId],
    references: [users.id],
  }),
  customerServices: many(customerServices),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  customerServices: many(customerServices),
}));

export const customerServicesRelations = relations(customerServices, ({ one }) => ({
  customer: one(customers, {
    fields: [customerServices.customerId],
    references: [customers.id],
  }),
  service: one(services, {
    fields: [customerServices.serviceId],
    references: [services.id],
  }),
  createdBy: one(users, {
    fields: [customerServices.createdById],
    references: [users.id],
  }),
}));

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type CustomerService = typeof customerServices.$inferSelect;
export type NewCustomerService = typeof customerServices.$inferInsert;
