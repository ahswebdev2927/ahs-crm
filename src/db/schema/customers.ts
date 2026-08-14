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
  price: integer('price').notNull(), // base price in cents
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('services_code_idx').on(t.code),
]);

export const customerServices = sqliteTable('customer_services', {
  id: text('id').primaryKey(), // UUID
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id').notNull().references(() => services.id),
  price: integer('price').notNull(), // actual client price in cents
  status: text('status', { enum: ['active', 'suspended', 'cancelled', 'expired'] }).notNull().default('active'),
  startDate: integer('start_date', { mode: 'timestamp_ms' }),
  endDate: integer('end_date', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('customer_services_customer_id_idx').on(t.customerId),
  index('customer_services_service_id_idx').on(t.serviceId),
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
}));
