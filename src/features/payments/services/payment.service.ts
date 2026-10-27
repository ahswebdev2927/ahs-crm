import { AppError } from "@/lib/errors/AppError";
import { logSystemEvent } from "@/features/activities/services/activity.service";
import { recordAuditLog } from "@/features/audit/services/audit.service";
import { sendNotification } from "@/features/notifications/services/notification.service";
import {
  assertUserPermission,
  checkCustomerAccess,
} from "@/features/auth/services/authorization.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import { findInvoiceById } from "@/features/invoices/repositories/invoice.repository";
import {
  findPayments,
  findPaymentById,
  recordPaymentTransaction,
  updatePaymentStatusRecord,
  getPaymentsKpis,
} from "../repositories/payment.repository";
import {
  recordPaymentSchema,
  paymentQuerySchema,
  updatePaymentStatusSchema,
  type RecordPaymentInput,
  type PaymentQueryInput,
  type UpdatePaymentStatusInput,
} from "../schemas/payment.schema";
import type { PaymentItem, PaymentKpis } from "../types/payment.types";

/**
 * Lists payment transactions scoped to the user's permissions and visibility.
 */
export const getPayments = async (
  user: AuthenticatedUserPayload,
  params: PaymentQueryInput
): Promise<{ items: PaymentItem[]; total: number; page: number; limit: number }> => {
  assertUserPermission(user, "payments:view");
  const validated = paymentQuerySchema.parse(params);

  const isUnrestricted =
    user.role.code === "super_admin" || user.role.code === "sales_manager";

  return findPayments(validated, {
    isUnrestricted,
    userId: user.id,
  });
};

/**
 * Retrieves a single payment record by ID.
 */
export const getPayment = async (
  user: AuthenticatedUserPayload,
  id: string
): Promise<PaymentItem> => {
  assertUserPermission(user, "payments:view");
  const payment = await findPaymentById(id);
  if (!payment) {
    throw new AppError("Payment transaction not found.", 404, "NOT_FOUND");
  }

  const isSuper =
    user.role.code === "super_admin" || user.role.code === "sales_manager";
  if (!isSuper && payment.receivedById !== user.id && payment.customerId) {
    await checkCustomerAccess(payment.customerId, "view", user);
  }

  return payment;
};

/**
 * Records a customer payment against an invoice inside an atomic transaction.
 */
export const recordPayment = async (
  user: AuthenticatedUserPayload,
  input: RecordPaymentInput
): Promise<PaymentItem> => {
  assertUserPermission(user, "payments:create");
  const validated = recordPaymentSchema.parse(input);

  const invoice = await findInvoiceById(validated.invoiceId);
  if (!invoice) {
    throw new AppError("Invoice not found.", 404, "NOT_FOUND");
  }

  if (invoice.status === "cancelled" || invoice.status === "void") {
    throw new AppError(
      `Cannot record payment on a ${invoice.status} invoice.`,
      400,
      "INVALID_STATE"
    );
  }

  if (validated.amount > invoice.amountDue) {
    const amountInRupees = (validated.amount / 100).toLocaleString("en-IN");
    const dueInRupees = (invoice.amountDue / 100).toLocaleString("en-IN");
    throw new AppError(
      `Payment amount of ₹${amountInRupees} exceeds the remaining invoice balance of ₹${dueInRupees}.`,
      400,
      "EXCESS_PAYMENT"
    );
  }

  await checkCustomerAccess(invoice.customerId, "view", user);

  const payment = await recordPaymentTransaction(validated, user.id);

  if (invoice.createdById) {
    sendNotification({
      recipientId: invoice.createdById,
      title: "Payment Received",
      message: `Payment of ₹${(validated.amount / 100).toLocaleString("en-IN")} recorded for Invoice #${invoice.invoiceNumber || invoice.id.slice(0, 8)}.`,
      category: "financials",
      type: "payment:received",
      actionUrl: `/invoices/${invoice.id}`,
      referenceId: payment.id,
    }).catch(() => {});
  }

  recordAuditLog({
    userId: user.id,
    action: "payment:received",
    entityType: "payment",
    entityId: payment.id,
    newData: {
      invoiceId: validated.invoiceId,
      customerId: invoice.customerId,
      amount: validated.amount,
      method: validated.paymentMethod,
    },
  }).catch(() => {});

  logSystemEvent({
    customerId: invoice.customerId,
    userId: user.id,
    type: "payment_received",
    subject: `Payment received: ₹${(validated.amount / 100).toLocaleString("en-IN")}`,
    description: `Received payment for Invoice #${invoice.invoiceNumber || invoice.id.slice(0, 8)} via ${validated.paymentMethod}${
      validated.transactionReference ? ` (Ref: ${validated.transactionReference})` : ""
    }`,
    outcome: "received",
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      amountPaise: validated.amount,
      paymentMethod: validated.paymentMethod,
      paymentReference: validated.transactionReference,
    },
    createdAt: validated.paymentDate ? new Date(validated.paymentDate) : new Date(),
  }).catch(() => {});

  return payment;
};

/**
 * Updates a payment's status (e.g. marking as refunded or failed/reversed)
 * and recalculates customer invoice balance atomically.
 */
export const updatePaymentStatus = async (
  user: AuthenticatedUserPayload,
  paymentId: string,
  input: UpdatePaymentStatusInput
): Promise<PaymentItem> => {
  assertUserPermission(user, "payments:create");
  const validated = updatePaymentStatusSchema.parse(input);

  const existing = await findPaymentById(paymentId);
  if (!existing) {
    throw new AppError("Payment transaction not found.", 404, "NOT_FOUND");
  }

  const isSuper =
    user.role.code === "super_admin" || user.role.code === "sales_manager";
  if (!isSuper && existing.receivedById !== user.id && existing.customerId) {
    await checkCustomerAccess(existing.customerId, "view", user);
  }

  const updated = await updatePaymentStatusRecord(paymentId, validated.status, validated.reason);

  recordAuditLog({
    userId: user.id,
    action: `payment:${validated.status}`,
    entityType: "payment",
    entityId: paymentId,
    oldData: { status: existing.status },
    newData: { status: validated.status, reason: validated.reason },
  }).catch(() => {});

  return updated;
};

/**
 * Retrieves aggregate collection KPIs for the authenticated user's scope.
 */
export const getPaymentsStats = async (
  user: AuthenticatedUserPayload
): Promise<PaymentKpis> => {
  assertUserPermission(user, "payments:view");
  const isUnrestricted =
    user.role.code === "super_admin" || user.role.code === "sales_manager";

  return getPaymentsKpis({
    isUnrestricted,
    userId: user.id,
  });
};

