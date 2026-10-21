import { db } from "@/db";
import { payments, invoices, customers, users } from "@/db/schema";
import { eq, and, or, sql, like, inArray, gte, lte, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { PaymentItem, PaymentKpis } from "../types/payment.types";
import type { RecordPaymentInput } from "../schemas/payment.schema";

/**
 * Lists payment transactions with pagination, filters, and visibility scoping.
 */
export const findPayments = async (
  params: {
    page: number;
    limit: number;
    invoiceId?: string;
    customerId?: string;
    paymentMethod?: string;
    search?: string;
    dateFrom?: number;
    dateTo?: number;
  },
  visibility?: {
    allowedCustomerIds?: string[];
    isUnrestricted?: boolean;
    userId?: string;
  }
): Promise<{ items: PaymentItem[]; total: number; page: number; limit: number }> => {
  const { page, limit, invoiceId, customerId, paymentMethod, search, dateFrom, dateTo } = params;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (invoiceId) conditions.push(eq(payments.invoiceId, invoiceId));
  if (customerId) conditions.push(eq(payments.customerId, customerId));
  if (paymentMethod) conditions.push(eq(payments.paymentMethod, paymentMethod));
  if (dateFrom) conditions.push(gte(payments.paymentDate, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(payments.paymentDate, new Date(dateTo)));

  // Visibility scoping
  if (visibility && !visibility.isUnrestricted) {
    const visConditions = [];
    if (visibility.userId) {
      visConditions.push(eq(payments.receivedById, visibility.userId));
    }
    if (visibility.allowedCustomerIds && visibility.allowedCustomerIds.length > 0) {
      visConditions.push(inArray(payments.customerId, visibility.allowedCustomerIds));
    }
    if (visConditions.length > 0) {
      conditions.push(or(...visConditions));
    } else if (visibility.userId) {
      conditions.push(eq(payments.receivedById, visibility.userId));
    }
  }

  // Search filter
  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        like(payments.transactionReference, term),
        like(payments.notes, term),
        like(invoices.invoiceNumber, term)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(whereClause)
    .get();
  const total = Number(countRes?.count ?? 0);

  const rows = await db
    .select({
      id: payments.id,
      invoiceId: payments.invoiceId,
      customerId: payments.customerId,
      amount: payments.amount,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      transactionReference: payments.transactionReference,
      receiptUrl: payments.receiptUrl,
      receiptPublicId: payments.receiptPublicId,
      notes: payments.notes,
      status: payments.status,
      receivedById: payments.receivedById,
      createdAt: payments.createdAt,
      updatedAt: payments.updatedAt,
      receivedByName: users.name,
      receivedByEmail: users.email,
      invoiceNumber: invoices.invoiceNumber,
      invoiceTotal: invoices.total,
      invoiceAmountPaid: invoices.amountPaid,
      invoiceAmountDue: invoices.amountDue,
      invoiceStatus: invoices.status,
      customerName: customers.name,
      customerCompany: customers.company,
      customerEmail: customers.email,
      customerPhone: customers.phone,
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .leftJoin(customers, eq(payments.customerId, customers.id))
    .leftJoin(users, eq(payments.receivedById, users.id))
    .where(whereClause)
    .orderBy(desc(payments.paymentDate))
    .limit(limit)
    .offset(offset)
    .all();

  const items: PaymentItem[] = rows.map((r) => ({
    id: r.id,
    invoiceId: r.invoiceId,
    customerId: r.customerId,
    amount: r.amount,
    paymentDate: r.paymentDate instanceof Date ? r.paymentDate.getTime() : Number(r.paymentDate),
    paymentMethod: r.paymentMethod as any,
    transactionReference: r.transactionReference,
    receiptUrl: r.receiptUrl,
    receiptPublicId: r.receiptPublicId,
    notes: r.notes,
    status: r.status as any,
    receivedById: r.receivedById,
    createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : Number(r.createdAt),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.getTime() : Number(r.updatedAt),
    receivedByName: r.receivedByName,
    receivedByEmail: r.receivedByEmail,
    invoice: r.invoiceNumber
      ? {
          id: r.invoiceId,
          invoiceNumber: r.invoiceNumber,
          total: r.invoiceTotal || 0,
          amountPaid: r.invoiceAmountPaid || 0,
          amountDue: r.invoiceAmountDue || 0,
          status: r.invoiceStatus || "unpaid",
        }
      : null,
    customer: r.customerId
      ? {
          id: r.customerId,
          name: r.customerName || "Unknown Customer",
          company: r.customerCompany,
          email: r.customerEmail,
          phone: r.customerPhone,
        }
      : null,
  }));

  return { items, total, page, limit };
};

/**
 * Finds a single payment by ID with customer, invoice, and receiver details.
 */
export const findPaymentById = async (id: string): Promise<PaymentItem | null> => {
  const r = await db
    .select({
      id: payments.id,
      invoiceId: payments.invoiceId,
      customerId: payments.customerId,
      amount: payments.amount,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      transactionReference: payments.transactionReference,
      receiptUrl: payments.receiptUrl,
      receiptPublicId: payments.receiptPublicId,
      notes: payments.notes,
      status: payments.status,
      receivedById: payments.receivedById,
      createdAt: payments.createdAt,
      updatedAt: payments.updatedAt,
      receivedByName: users.name,
      receivedByEmail: users.email,
      invoiceNumber: invoices.invoiceNumber,
      invoiceTotal: invoices.total,
      invoiceAmountPaid: invoices.amountPaid,
      invoiceAmountDue: invoices.amountDue,
      invoiceStatus: invoices.status,
      customerName: customers.name,
      customerCompany: customers.company,
      customerEmail: customers.email,
      customerPhone: customers.phone,
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .leftJoin(customers, eq(payments.customerId, customers.id))
    .leftJoin(users, eq(payments.receivedById, users.id))
    .where(eq(payments.id, id))
    .get();

  if (!r) return null;

  return {
    id: r.id,
    invoiceId: r.invoiceId,
    customerId: r.customerId,
    amount: r.amount,
    paymentDate: r.paymentDate instanceof Date ? r.paymentDate.getTime() : Number(r.paymentDate),
    paymentMethod: r.paymentMethod as any,
    transactionReference: r.transactionReference,
    receiptUrl: r.receiptUrl,
    receiptPublicId: r.receiptPublicId,
    notes: r.notes,
    status: r.status as any,
    receivedById: r.receivedById,
    createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : Number(r.createdAt),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.getTime() : Number(r.updatedAt),
    receivedByName: r.receivedByName,
    receivedByEmail: r.receivedByEmail,
    invoice: r.invoiceNumber
      ? {
          id: r.invoiceId,
          invoiceNumber: r.invoiceNumber,
          total: r.invoiceTotal || 0,
          amountPaid: r.invoiceAmountPaid || 0,
          amountDue: r.invoiceAmountDue || 0,
          status: r.invoiceStatus || "unpaid",
        }
      : null,
    customer: r.customerId
      ? {
          id: r.customerId,
          name: r.customerName || "Unknown Customer",
          company: r.customerCompany,
          email: r.customerEmail,
          phone: r.customerPhone,
        }
      : null,
  };
};

/**
 * Records a payment against an invoice inside an atomic Drizzle database transaction.
 * Automatically updates invoice's amountPaid, amountDue, and status.
 */
export const recordPaymentTransaction = async (
  data: RecordPaymentInput,
  receivedById: string
): Promise<PaymentItem> => {
  const paymentId = randomUUID();

  await db.transaction(async (tx) => {
    // 1. Fetch current invoice state with write-lock consistency
    const inv = await tx
      .select({
        id: invoices.id,
        customerId: invoices.customerId,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        amountDue: invoices.amountDue,
        status: invoices.status,
      })
      .from(invoices)
      .where(eq(invoices.id, data.invoiceId))
      .get();

    if (!inv) {
      throw new Error("Invoice not found.");
    }

    if (inv.status === "cancelled" || inv.status === "void") {
      throw new Error(`Cannot record payment for an invoice in '${inv.status}' status.`);
    }

    if (data.amount > inv.amountDue) {
      throw new Error(
        `Payment amount of ₹${(data.amount / 100).toLocaleString("en-IN")} exceeds the remaining balance of ₹${(inv.amountDue / 100).toLocaleString("en-IN")}.`
      );
    }

    // 2. Insert payment record
    await tx.insert(payments).values({
      id: paymentId,
      invoiceId: data.invoiceId,
      customerId: inv.customerId,
      amount: data.amount,
      paymentDate: new Date(data.paymentDate),
      paymentMethod: data.paymentMethod,
      transactionReference: data.transactionReference || null,
      receiptUrl: data.receiptUrl || null,
      receiptPublicId: data.receiptPublicId || null,
      notes: data.notes || null,
      status: "completed",
      receivedById,
    });

    // 3. Resiliently recalculate invoice balances from all completed payments
    const sumResult = await tx
      .select({
        totalPaid: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(and(eq(payments.invoiceId, data.invoiceId), eq(payments.status, "completed")))
      .get();

    const newAmountPaid = Number(sumResult?.totalPaid ?? 0);
    const newAmountDue = Math.max(0, inv.total - newAmountPaid);
    const newStatus = newAmountDue <= 0 ? "paid" : "partially_paid";

    await tx
      .update(invoices)
      .set({
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, data.invoiceId));
  });

  const created = await findPaymentById(paymentId);
  if (!created) throw new Error("Failed to retrieve created payment record.");
  return created;
};

/**
 * Updates a payment's status (e.g., refunding or voiding) and atomically recalculates
 * the related invoice's amountPaid, amountDue, and payment status.
 */
export const updatePaymentStatusRecord = async (
  paymentId: string,
  status: "completed" | "refunded" | "failed",
  reason?: string
): Promise<PaymentItem> => {
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({
        id: payments.id,
        invoiceId: payments.invoiceId,
        status: payments.status,
        notes: payments.notes,
      })
      .from(payments)
      .where(eq(payments.id, paymentId))
      .get();

    if (!existing) {
      throw new Error("Payment record not found.");
    }

    if (existing.status === status) {
      return;
    }

    // 1. Fetch current invoice state
    const inv = await tx
      .select({
        id: invoices.id,
        total: invoices.total,
        status: invoices.status,
      })
      .from(invoices)
      .where(eq(invoices.id, existing.invoiceId))
      .get();

    if (!inv) {
      throw new Error("Associated invoice not found.");
    }

    const updatedNotes = reason
      ? existing.notes
        ? `${existing.notes} | Status changed to ${status}: ${reason}`
        : `Status changed to ${status}: ${reason}`
      : existing.notes;

    // 2. Update payment status
    await tx
      .update(payments)
      .set({
        status,
        notes: updatedNotes,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    // 3. Resiliently re-aggregate all completed payments for this invoice
    const sumResult = await tx
      .select({
        totalPaid: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(and(eq(payments.invoiceId, existing.invoiceId), eq(payments.status, "completed")))
      .get();

    const newAmountPaid = Number(sumResult?.totalPaid ?? 0);
    const newAmountDue = Math.max(0, inv.total - newAmountPaid);

    // If invoice is void or cancelled, do not mutate its status
    if (inv.status !== "void" && inv.status !== "cancelled") {
      const newStatus =
        newAmountDue <= 0
          ? "paid"
          : newAmountPaid > 0
          ? "partially_paid"
          : "unpaid";

      await tx
        .update(invoices)
        .set({
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, existing.invoiceId));
    }
  });

  const updated = await findPaymentById(paymentId);
  if (!updated) throw new Error("Failed to retrieve updated payment record.");
  return updated;
};

/**
 * Aggregates collection KPIs for payments.
 */
export const getPaymentsKpis = async (
  visibility?: {
    allowedCustomerIds?: string[];
    isUnrestricted?: boolean;
    userId?: string;
  }
): Promise<PaymentKpis> => {
  const conditions = [];

  if (visibility && !visibility.isUnrestricted) {
    const visConditions = [];
    if (visibility.userId) visConditions.push(eq(payments.receivedById, visibility.userId));
    if (visibility.allowedCustomerIds && visibility.allowedCustomerIds.length > 0) {
      visConditions.push(inArray(payments.customerId, visibility.allowedCustomerIds));
    }
    if (visConditions.length > 0) {
      conditions.push(or(...visConditions));
    } else if (visibility.userId) {
      conditions.push(eq(payments.receivedById, visibility.userId));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const allPayments = await db
    .select({
      amount: payments.amount,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      status: payments.status,
    })
    .from(payments)
    .where(whereClause)
    .all();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let totalCollected = 0;
  let todayCollected = 0;
  let monthCollected = 0;
  const methodBreakdown: Record<string, number> = {};

  for (const p of allPayments) {
    if (p.status !== "completed") continue;

    totalCollected += p.amount;

    const pDateMs = p.paymentDate instanceof Date ? p.paymentDate.getTime() : Number(p.paymentDate);
    if (pDateMs >= startOfToday) {
      todayCollected += p.amount;
    }
    if (pDateMs >= startOfMonth) {
      monthCollected += p.amount;
    }

    methodBreakdown[p.paymentMethod] = (methodBreakdown[p.paymentMethod] || 0) + p.amount;
  }

  return {
    totalCollected,
    todayCollected,
    monthCollected,
    transactionCount: allPayments.length,
    methodBreakdown,
  };
};
