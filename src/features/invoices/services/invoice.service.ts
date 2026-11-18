import { db } from "@/db";
import { customers, invoices } from "@/db/schema";
import { eq, and, notInArray } from "drizzle-orm";
import { AppError } from "@/lib/errors/AppError";
import { CacheService, CACHE_TAGS } from "@/lib/cache/cache.service";
import { ceilToWholeRupeePaise } from "@/lib/formatters";
import { logSystemEvent } from "@/features/activities/services/activity.service";
import {
  recordAuditLog,
  recordLeadActivityIfApplicable,
} from "@/features/audit/services/audit.service";
import {
  assertUserPermission,
  checkCustomerAccess,
} from "@/features/auth/services/authorization.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import { findQuotationById } from "@/features/quotations/repositories/quotation.repository";
import {
  findInvoices,
  findInvoiceById,
  createInvoiceRecord,
  convertQuotationToInvoiceRecord,
  updateInvoiceRecord,
  updateInvoiceStatusRecord,
  getInvoicesKpis,
} from "../repositories/invoice.repository";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
  invoiceQuerySchema,
  convertQuotationToInvoiceSchema,
  type CreateInvoiceInput,
  type UpdateInvoiceInput,
  type UpdateInvoiceStatusInput,
  type InvoiceQueryInput,
  type InvoiceItemInput,
  type ConvertQuotationToInvoiceInput,
} from "../schemas/invoice.schema";
import type {
  InvoiceItem,
  InvoiceDetail,
  InvoiceKpis,
} from "../types/invoice.types";

/**
 * Authoritative financial math helper for invoices.
 * Calculates subtotal, discount, tax, and total in integer minor units (paise).
 */
const invalidateInvoiceCaches = (user: AuthenticatedUserPayload): void => {
  const tags: string[] = [
    CACHE_TAGS.DASHBOARD_BUSINESS,
    CACHE_TAGS.FINANCIAL_STATS,
    CACHE_TAGS.DASHBOARD_USER(user.id),
  ];
  if (user.teamId) tags.push(CACHE_TAGS.DASHBOARD_TEAM(user.teamId));
  CacheService.invalidateTags(tags);
};

export const calculateInvoiceFinancials = (
  items: InvoiceItemInput[],
  discountInput = 0,
  taxRate = 18
): { subtotal: number; discount: number; tax: number; total: number } => {
  const subtotal = items.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unitPrice),
    0
  );
  const discount = Math.min(subtotal, Math.max(0, Math.round(discountInput)));
  const taxable = subtotal - discount;
  const tax = Math.round((taxable * Math.max(0, taxRate)) / 100);
  const rawTotal = taxable + tax;
  // Ceiling round total to nearest whole Rupee (in paise)
  const total = ceilToWholeRupeePaise(rawTotal);

  return { subtotal, discount, tax, total };
};

/**
 * Lists invoices scoped to the authenticated user's permissions and visibility.
 */
export const getInvoices = async (
  user: AuthenticatedUserPayload,
  params: InvoiceQueryInput
): Promise<{ items: InvoiceItem[]; total: number; page: number; limit: number }> => {
  assertUserPermission(user, "invoices:view");
  const validated = invoiceQuerySchema.parse(params);

  const isUnrestricted =
    user.role.code === "super_admin" || user.role.code === "sales_manager";

  return findInvoices(validated, {
    isUnrestricted,
    userId: user.id,
  });
};

/**
 * Retrieves a single invoice with items, customer details, and payment history.
 */
export const getInvoice = async (
  user: AuthenticatedUserPayload,
  id: string
): Promise<InvoiceDetail> => {
  assertUserPermission(user, "invoices:view");
  const invoice = await findInvoiceById(id);
  if (!invoice) {
    throw new AppError("Invoice not found.", 404, "NOT_FOUND");
  }

  const isSuper =
    user.role.code === "super_admin" || user.role.code === "sales_manager";
  if (!isSuper && invoice.createdById !== user.id) {
    await checkCustomerAccess(invoice.customerId, "view", user);
  }

  return invoice;
};

/**
 * Creates and issues a new customer invoice (SuperAdmin and SalesManager only).
 */
export const createInvoice = async (
  user: AuthenticatedUserPayload,
  input: CreateInvoiceInput
): Promise<InvoiceDetail> => {
  assertUserPermission(user, "invoices:create");
  const validated = createInvoiceSchema.parse(input);

  await checkCustomerAccess(validated.customerId, "view", user);

  const { subtotal, discount, tax, total } = calculateInvoiceFinancials(
    validated.items,
    validated.discount,
    validated.taxRate
  );

  const created = await createInvoiceRecord(
    {
      customerId: validated.customerId,
      quotationId: validated.quotationId,
      issueDate: validated.issueDate,
      dueDate: validated.dueDate,
      subtotal,
      discount,
      tax,
      total,
      notes: validated.notes,
      terms: validated.terms,
      items: validated.items,
    },
    user.id
  );

  recordAuditLog({
    userId: user.id,
    action: "invoice:created",
    entityType: "invoice",
    entityId: created.id,
    newData: {
      invoiceNumber: created.invoiceNumber,
      customerId: created.customerId,
      quotationId: created.quotationId,
      total: created.total,
      subtotal: created.subtotal,
      dueDate: created.dueDate,
    },
  }).catch(() => {});

  invalidateInvoiceCaches(user);

  return created;
};

/**
 * Converts an accepted quotation into an invoice.
 */
export const convertQuotationToInvoice = async (
  user: AuthenticatedUserPayload,
  quotationId: string,
  input: ConvertQuotationToInvoiceInput
): Promise<InvoiceDetail> => {
  assertUserPermission(user, "invoices:create");
  const validated = convertQuotationToInvoiceSchema.parse(input);

  const quote = await findQuotationById(quotationId);
  if (!quote) {
    throw new AppError("Quotation not found.", 404, "NOT_FOUND");
  }

  if (quote.status !== "accepted") {
    throw new AppError(
      `Only accepted quotations can be converted to an invoice. Current status: '${quote.status}'.`,
      400,
      "INVALID_STATE"
    );
  }

  // Prevent duplicate active invoice conversion
  const existingActiveInvoice = await db
    .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(
      and(
        eq(invoices.quotationId, quotationId),
        notInArray(invoices.status, ["cancelled", "void"])
      )
    )
    .get();

  if (existingActiveInvoice) {
    throw new AppError(
      `This quotation has already been converted to invoice ${existingActiveInvoice.invoiceNumber}.`,
      400,
      "DUPLICATE_CONVERSION"
    );
  }

  // Ensure customer exists
  let customerId = quote.customerId;
  if (!customerId && quote.leadId) {
    // Check if the lead has been converted to a customer in the CRM
    const convertedCustomer = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.leadId, quote.leadId))
      .get();

    if (convertedCustomer) {
      customerId = convertedCustomer.id;
    } else {
      throw new AppError(
        "This quotation is linked to a Lead that has not yet been converted to a Customer. Please convert the lead to a customer first before generating an invoice.",
        400,
        "PRECONDITION_FAILED"
      );
    }
  }

  if (!customerId) {
    throw new AppError("Customer ID is missing on this quotation.", 400, "MISSING_CUSTOMER");
  }

  const invoice = await convertQuotationToInvoiceRecord(
    quotationId,
    customerId,
    validated.dueDate,
    validated.notes || null,
    validated.terms || null,
    user.id
  );

  // Audit Log & Lead Timeline
  recordAuditLog({
    userId: user.id,
    action: "quotation:converted_to_invoice",
    entityType: "quotation",
    entityId: quotationId,
    newData: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, customerId },
  }).catch(() => {});

  recordAuditLog({
    userId: user.id,
    action: "invoice:created",
    entityType: "invoice",
    entityId: invoice.id,
    newData: {
      invoiceNumber: invoice.invoiceNumber,
      customerId,
      quotationId,
      total: invoice.total,
      dueDate: invoice.dueDate,
    },
  }).catch(() => {});

  if (quote.leadId) {
    recordLeadActivityIfApplicable(
      quote.leadId,
      user.id,
      "note",
      `Quotation ${quote.quoteNumber} converted to official invoice ${invoice.invoiceNumber}.`
    ).catch(() => {});
  }

  logSystemEvent({
    leadId: quote.leadId,
    customerId,
    userId: user.id,
    type: "invoice_issued",
    subject: `Invoice ${invoice.invoiceNumber} issued`,
    description: `Official invoice issued with total amount of ₹${(invoice.total / 100).toLocaleString("en-IN")}`,
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      quoteNumber: quote.quoteNumber,
      amountPaise: invoice.total,
    },
  }).catch(() => {});

  invalidateInvoiceCaches(user);

  return invoice;
};

/**
 * Updates an unpaid invoice with zero recorded payments.
 */
export const updateInvoice = async (
  user: AuthenticatedUserPayload,
  id: string,
  input: UpdateInvoiceInput
): Promise<InvoiceDetail> => {
  assertUserPermission(user, "invoices:create");
  const validated = updateInvoiceSchema.parse(input);

  const existing = await findInvoiceById(id);
  if (!existing) {
    throw new AppError("Invoice not found.", 404, "NOT_FOUND");
  }

  if (existing.amountPaid > 0) {
    throw new AppError(
      "Cannot modify invoice lines or totals after payments have been recorded. Void or issue a credit note instead.",
      400,
      "PAYMENTS_EXIST"
    );
  }

  if (existing.status === "cancelled" || existing.status === "void") {
    throw new AppError("Cannot edit a cancelled or voided invoice.", 400, "INVALID_STATE");
  }

  const itemsToCompute = validated.items || existing.items;
  const discountToCompute =
    validated.discount !== undefined ? validated.discount : existing.discount;

  const { subtotal, discount, tax, total } = calculateInvoiceFinancials(
    itemsToCompute,
    discountToCompute,
    validated.taxRate || 18
  );

  const updated = await updateInvoiceRecord(id, {
    dueDate: validated.dueDate,
    subtotal,
    discount,
    tax,
    total,
    notes: validated.notes,
    terms: validated.terms,
    items: validated.items,
  });

  recordAuditLog({
    userId: user.id,
    action: "invoice:updated",
    entityType: "invoice",
    entityId: id,
    oldData: {
      subtotal: existing.subtotal,
      discount: existing.discount,
      tax: existing.tax,
      total: existing.total,
      dueDate: existing.dueDate,
    },
    newData: {
      subtotal,
      discount,
      tax,
      total,
      dueDate: validated.dueDate,
    },
  }).catch(() => {});

  invalidateInvoiceCaches(user);

  return updated;
};

/**
 * Updates invoice status (e.g. void or cancel).
 */
export const updateInvoiceStatus = async (
  user: AuthenticatedUserPayload,
  id: string,
  input: UpdateInvoiceStatusInput
): Promise<InvoiceDetail> => {
  assertUserPermission(user, "invoices:create");
  const validated = updateInvoiceStatusSchema.parse(input);

  const existing = await findInvoiceById(id);
  if (!existing) {
    throw new AppError("Invoice not found.", 404, "NOT_FOUND");
  }

  if (existing.amountPaid > 0 && (validated.status === "cancelled" || validated.status === "void")) {
    throw new AppError(
      "Cannot cancel or void an invoice with recorded payments. Please refund or reconcile payments first.",
      400,
      "PAYMENTS_EXIST"
    );
  }

  const updated = await updateInvoiceStatusRecord(id, validated.status);

  recordAuditLog({
    userId: user.id,
    action: "invoice:status_changed",
    entityType: "invoice",
    entityId: id,
    oldData: { status: existing.status },
    newData: { status: validated.status },
  }).catch(() => {});

  invalidateInvoiceCaches(user);

  return updated;
};

/**
 * Retrieves aggregate invoicing KPIs for the user's scope.
 */
export const getInvoicesStats = async (
  user: AuthenticatedUserPayload
): Promise<InvoiceKpis> => {
  assertUserPermission(user, "invoices:view");
  const isUnrestricted =
    user.role.code === "super_admin" || user.role.code === "sales_manager";

  return getInvoicesKpis({
    isUnrestricted,
    userId: user.id,
  });
};
