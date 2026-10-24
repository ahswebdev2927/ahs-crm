import { AppError } from "@/lib/errors/AppError";
import { logSystemEvent } from "@/features/activities/services/activity.service";
import {
  recordAuditLog,
  recordLeadActivityIfApplicable,
} from "@/features/audit/services/audit.service";
import {
  assertUserPermission,
  checkLeadAccess,
  checkCustomerAccess,
} from "@/features/auth/services/authorization.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import {
  findQuotations,
  findQuotationById,
  createQuotationRecord,
  updateQuotationRecord,
  updateQuotationStatusRecord,
  getQuotationsKpis,
} from "../repositories/quotation.repository";
import {
  createQuotationSchema,
  updateQuotationSchema,
  updateQuotationStatusSchema,
  quotationQuerySchema,
  type CreateQuotationInput,
  type UpdateQuotationInput,
  type UpdateQuotationStatusInput,
  type QuotationQueryInput,
  type QuotationItemInput,
} from "../schemas/quotation.schema";
import type {
  QuotationItem,
  QuotationDetail,
  QuotationKpis,
} from "../types/quotation.types";

/**
 * Authoritative financial math helper.
 * Calculates subtotal, discount, tax, and total strictly in integer minor units (paise).
 */
export const calculateQuotationFinancials = (
  items: QuotationItemInput[],
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
 * Lists quotations scoped to the authenticated user's permissions and role.
 */
export const getQuotations = async (
  user: AuthenticatedUserPayload,
  params: QuotationQueryInput
): Promise<{ items: QuotationItem[]; total: number; page: number; limit: number }> => {
  assertUserPermission(user, "quotations:view");
  const validated = quotationQuerySchema.parse(params);

  const isUnrestricted =
    user.role.code === "super_admin" || user.role.code === "sales_manager";

  return findQuotations(validated, {
    isUnrestricted,
    userId: user.id,
  });
};

/**
 * Retrieves a single quotation with its line items and client profile.
 */
export const getQuotation = async (
  user: AuthenticatedUserPayload,
  id: string
): Promise<QuotationDetail> => {
  assertUserPermission(user, "quotations:view");
  const quote = await findQuotationById(id);
  if (!quote) {
    throw new AppError("Quotation not found.", 404, "NOT_FOUND");
  }

  // Check access to lead/customer or ownership
  const isSuper =
    user.role.code === "super_admin" || user.role.code === "sales_manager";
  if (!isSuper && quote.createdById !== user.id) {
    if (quote.leadId) {
      await checkLeadAccess(quote.leadId, "view", user);
    } else if (quote.customerId) {
      await checkCustomerAccess(quote.customerId, "view", user);
    }
  }

  return quote;
};

/**
 * Creates a new commercial quotation for a Lead or Customer.
 */
export const createQuotation = async (
  user: AuthenticatedUserPayload,
  input: CreateQuotationInput
): Promise<QuotationDetail> => {
  assertUserPermission(user, "quotations:create");
  const validated = createQuotationSchema.parse(input);

  // Validate visibility of target client
  if (validated.leadId) {
    await checkLeadAccess(validated.leadId, "view", user);
  }
  if (validated.customerId) {
    await checkCustomerAccess(validated.customerId, "view", user);
  }

  const { subtotal, discount, tax, total } = calculateQuotationFinancials(
    validated.items,
    validated.discount,
    validated.taxRate
  );

  const created = await createQuotationRecord(
    {
      leadId: validated.leadId,
      customerId: validated.customerId,
      validUntil: validated.validUntil,
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

  logSystemEvent({
    leadId: created.leadId,
    customerId: created.customerId,
    userId: user.id,
    type: "quotation_created",
    subject: `Quotation ${created.quoteNumber} created`,
    description: `Created quotation with total value of ₹${(created.total / 100).toLocaleString("en-IN")}`,
    metadata: {
      quoteNumber: created.quoteNumber,
      amountPaise: created.total,
    },
  }).catch(() => {});

  return created;
};

/**
 * Modifies an existing quotation (permitted only while in 'draft' status).
 */
export const updateQuotation = async (
  user: AuthenticatedUserPayload,
  id: string,
  input: UpdateQuotationInput
): Promise<QuotationDetail> => {
  assertUserPermission(user, "quotations:create");
  const validated = updateQuotationSchema.parse(input);

  const existing = await findQuotationById(id);
  if (!existing) {
    throw new AppError("Quotation not found.", 404, "NOT_FOUND");
  }

  if (existing.status !== "draft") {
    throw new AppError(
      `Cannot modify quotation in '${existing.status}' status. Only draft quotations can be edited.`,
      400,
      "INVALID_STATE"
    );
  }

  // Authorization check
  const isSuper =
    user.role.code === "super_admin" || user.role.code === "sales_manager";
  if (!isSuper && existing.createdById !== user.id) {
    throw new AppError(
      "You can only modify quotations created by yourself.",
      403,
      "FORBIDDEN"
    );
  }

  // Re-calculate financial figures
  const itemsToCompute = validated.items || existing.items;
  const discountToCompute =
    validated.discount !== undefined ? validated.discount : existing.discount;

  const { subtotal, discount, tax, total } = calculateQuotationFinancials(
    itemsToCompute,
    discountToCompute,
    validated.taxRate || 18
  );

  return updateQuotationRecord(id, {
    validUntil: validated.validUntil,
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
 * Transitions quotation status (e.g., draft -> sent -> accepted / declined / expired).
 */
export const updateQuotationStatus = async (
  user: AuthenticatedUserPayload,
  id: string,
  input: UpdateQuotationStatusInput
): Promise<QuotationDetail> => {
  assertUserPermission(user, "quotations:create");
  const validated = updateQuotationStatusSchema.parse(input);

  const existing = await findQuotationById(id);
  if (!existing) {
    throw new AppError("Quotation not found.", 404, "NOT_FOUND");
  }

  // Validate state transitions
  if (existing.status === "accepted" && validated.status !== "accepted") {
    throw new AppError(
      "Accepted quotations cannot be reverted or changed to another state.",
      400,
      "IMMUTABLE_STATE"
    );
  }

  const updated = await updateQuotationStatusRecord(id, validated.status);

  recordAuditLog({
    userId: user.id,
    action: "quotation:status_change",
    entityType: "quotation",
    entityId: id,
    oldData: { status: existing.status },
    newData: { status: validated.status },
  }).catch(() => {});

  if (existing.leadId) {
    recordLeadActivityIfApplicable(
      existing.leadId,
      user.id,
      "note",
      `Quotation ${existing.quoteNumber} status changed from '${existing.status}' to '${validated.status}'.`
    ).catch(() => {});
  }

  const activityType =
    validated.status === "sent"
      ? "quotation_sent"
      : validated.status === "accepted"
      ? "quotation_accepted"
      : "quotation_created";

  logSystemEvent({
    leadId: existing.leadId,
    customerId: existing.customerId,
    userId: user.id,
    type: activityType,
    subject: `Quotation ${existing.quoteNumber} ${validated.status}`,
    description: `Quotation status changed from '${existing.status}' to '${validated.status}'. Total: ₹${(existing.total / 100).toLocaleString("en-IN")}`,
    outcome: validated.status,
    metadata: {
      quoteNumber: existing.quoteNumber,
      amountPaise: existing.total,
    },
  }).catch(() => {});

  return updated;
};

/**
 * Retrieves aggregate proposal KPIs for the current authenticated user's scope.
 */
export const getQuotationsStats = async (
  user: AuthenticatedUserPayload
): Promise<QuotationKpis> => {
  assertUserPermission(user, "quotations:view");
  const isUnrestricted =
    user.role.code === "super_admin" || user.role.code === "sales_manager";

  return getQuotationsKpis({
    isUnrestricted,
    userId: user.id,
  });
};
