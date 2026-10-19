import { AppError } from "@/lib/errors/AppError";
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
  const total = taxable + tax;

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

  return createInvoiceRecord(
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

  // Ensure customer exists
  let customerId = quote.customerId;
  if (!customerId && quote.leadId) {
    // If quote is only linked to a lead, verify if lead was converted to a customer
    const leadCustomer = quote.customer?.id;
    if (leadCustomer) {
      customerId = leadCustomer;
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

  return convertQuotationToInvoiceRecord(
    quotationId,
    customerId,
    validated.dueDate,
    validated.notes || null,
    validated.terms || null,
    user.id
  );
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

  return updateInvoiceRecord(id, {
    dueDate: validated.dueDate,
    subtotal,
    discount,
    tax,
    total,
    notes: validated.notes,
    terms: validated.terms,
    items: validated.items,
  });
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

  return updateInvoiceStatusRecord(id, validated.status);
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
