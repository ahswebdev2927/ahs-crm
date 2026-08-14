import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { leads } from "./leads";
import { customers, services } from "./customers";

export const quotations = sqliteTable('quotations', {
  id: text('id').primaryKey(), // UUID
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  quoteNumber: text('quote_number').notNull().unique(),
  validUntil: integer('valid_until', { mode: 'timestamp_ms' }).notNull(),
  subtotal: integer('subtotal').notNull(), // in cents
  discount: integer('discount').notNull().default(0), // in cents
  tax: integer('tax').notNull().default(0), // in cents
  total: integer('total').notNull(), // in cents
  status: text('status', { enum: ['draft', 'sent', 'accepted', 'declined', 'expired'] }).notNull().default('draft'),
  notes: text('notes'),
  createdById: text('created_by_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('quotations_lead_id_idx').on(t.leadId),
  index('quotations_customer_id_idx').on(t.customerId),
  index('quotations_quote_number_idx').on(t.quoteNumber),
]);

export const quotationItems = sqliteTable('quotation_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  quotationId: text('quotation_id').notNull().references(() => quotations.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id').references(() => services.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(), // in cents
  totalPrice: integer('total_price').notNull(), // in cents
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('quotation_items_quotation_id_idx').on(t.quotationId),
]);

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(), // UUID
  customerId: text('customer_id').notNull().references(() => customers.id),
  quotationId: text('quotation_id').references(() => quotations.id, { onDelete: 'set null' }),
  invoiceNumber: text('invoice_number').notNull().unique(),
  issueDate: integer('issue_date', { mode: 'timestamp_ms' }).notNull(),
  dueDate: integer('due_date', { mode: 'timestamp_ms' }).notNull(),
  subtotal: integer('subtotal').notNull(), // in cents
  discount: integer('discount').notNull().default(0), // in cents
  tax: integer('tax').notNull().default(0), // in cents
  total: integer('total').notNull(), // in cents
  amountPaid: integer('amount_paid').notNull().default(0), // in cents
  amountDue: integer('amount_due').notNull(), // in cents
  status: text('status', { enum: ['draft', 'unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled', 'void'] }).notNull().default('unpaid'),
  notes: text('notes'),
  createdById: text('created_by_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('invoices_customer_id_idx').on(t.customerId),
  index('invoices_invoice_number_idx').on(t.invoiceNumber),
  index('invoices_status_idx').on(t.status),
]);

export const invoiceItems = sqliteTable('invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id').references(() => services.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(), // in cents
  totalPrice: integer('total_price').notNull(), // in cents
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('invoice_items_invoice_id_idx').on(t.invoiceId),
]);

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(), // UUID
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(), // in cents
  paymentDate: integer('payment_date', { mode: 'timestamp_ms' }).notNull(),
  paymentMethod: text('payment_method').notNull(),
  transactionReference: text('transaction_reference'),
  notes: text('notes'),
  status: text('status', { enum: ['pending', 'completed', 'failed', 'refunded'] }).notNull().default('completed'),
  receivedById: text('received_by_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
}, (t) => [
  index('payments_invoice_id_idx').on(t.invoiceId),
  index('payments_received_by_id_idx').on(t.receivedById),
]);

// Relational Definitions
export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  lead: one(leads, {
    fields: [quotations.leadId],
    references: [leads.id],
  }),
  customer: one(customers, {
    fields: [quotations.customerId],
    references: [customers.id],
  }),
  createdBy: one(users, {
    fields: [quotations.createdById],
    references: [users.id],
  }),
  items: many(quotationItems),
  invoices: many(invoices),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationItems.quotationId],
    references: [quotations.id],
  }),
  service: one(services, {
    fields: [quotationItems.serviceId],
    references: [services.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  quotation: one(quotations, {
    fields: [invoices.quotationId],
    references: [quotations.id],
  }),
  createdBy: one(users, {
    fields: [invoices.createdById],
    references: [users.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  service: one(services, {
    fields: [invoiceItems.serviceId],
    references: [services.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  receivedBy: one(users, {
    fields: [payments.receivedById],
    references: [users.id],
  }),
}));
