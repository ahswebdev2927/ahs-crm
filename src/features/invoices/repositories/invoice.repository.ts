import { db } from "@/db";
import { invoices, invoiceItems, payments, quotations, quotationItems, customers, users } from "@/db/schema";
import { eq, and, or, sql, like, inArray, gte, lte, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import type {
  InvoiceItem,
  InvoiceDetail,
  InvoiceKpis,
  InvoiceStatus,
  InvoicePaymentSummary,
} from "../types/invoice.types";
import type { InvoiceItemInput } from "../schemas/invoice.schema";

/**
 * Generates a sequential invoice number: INV-YYYYMM-XXXX
 */
export const generateNextInvoiceNumber = async (tx?: any): Promise<string> => {
  const runner = tx || db;
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `INV-${yearMonth}-`;

  const existingInvoices = await runner
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(like(invoices.invoiceNumber, `${prefix}%`))
    .all();

  let maxSequence = 0;
  for (const inv of existingInvoices) {
    const parts = inv.invoiceNumber.split("-");
    if (parts.length === 3) {
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq) && seq > maxSequence) {
        maxSequence = seq;
      }
    }
  }

  const nextSeq = String(maxSequence + 1).padStart(4, "0");
  return `${prefix}${nextSeq}`;
};

/**
 * Find invoices with pagination, filtering, and data visibility scoping.
 */
export const findInvoices = async (
  params: {
    page: number;
    limit: number;
    status?: string;
    customerId?: string;
    search?: string;
    overdueOnly?: boolean;
    dateFrom?: number;
    dateTo?: number;
  },
  visibility?: {
    allowedCustomerIds?: string[];
    isUnrestricted?: boolean;
    userId?: string;
  }
): Promise<{ items: InvoiceItem[]; total: number; page: number; limit: number }> => {
  const { page, limit, status, customerId, search, overdueOnly, dateFrom, dateTo } = params;
  const offset = (page - 1) * limit;

  const conditions = [];
  const now = Date.now();

  // Overdue Filter
  if (overdueOnly) {
    conditions.push(lte(invoices.dueDate, new Date(now)));
    conditions.push(sql`${invoices.amountDue} > 0`);
    conditions.push(sql`${invoices.status} NOT IN ('cancelled', 'void')`);
  } else if (status && status !== "all") {
    if (status === "overdue") {
      conditions.push(lte(invoices.dueDate, new Date(now)));
      conditions.push(sql`${invoices.amountDue} > 0`);
      conditions.push(sql`${invoices.status} NOT IN ('cancelled', 'void')`);
    } else {
      conditions.push(eq(invoices.status, status as any));
    }
  }

  // Customer Filter
  if (customerId) {
    conditions.push(eq(invoices.customerId, customerId));
  }

  // Date range filter
  if (dateFrom) {
    conditions.push(gte(invoices.issueDate, new Date(dateFrom)));
  }
  if (dateTo) {
    conditions.push(lte(invoices.issueDate, new Date(dateTo)));
  }

  // Visibility Scope
  if (visibility && !visibility.isUnrestricted) {
    const visConditions = [];
    if (visibility.userId) {
      visConditions.push(eq(invoices.createdById, visibility.userId));
    }
    if (visibility.allowedCustomerIds && visibility.allowedCustomerIds.length > 0) {
      visConditions.push(inArray(invoices.customerId, visibility.allowedCustomerIds));
    }

    if (visConditions.length > 0) {
      conditions.push(or(...visConditions));
    } else if (visibility.userId) {
      conditions.push(eq(invoices.createdById, visibility.userId));
    }
  }

  // Search Filter: invoiceNumber, notes
  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    conditions.push(or(like(invoices.invoiceNumber, term), like(invoices.notes, term)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Total count
  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(whereClause)
    .get();
  const total = Number(countRes?.count ?? 0);

  // Rows query
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      customerId: invoices.customerId,
      quotationId: invoices.quotationId,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      subtotal: invoices.subtotal,
      discount: invoices.discount,
      tax: invoices.tax,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      amountDue: invoices.amountDue,
      status: invoices.status,
      notes: invoices.notes,
      terms: invoices.terms,
      createdById: invoices.createdById,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      customerName: customers.name,
      customerCompany: customers.company,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      createdByName: users.name,
      createdByEmail: users.email,
      quoteNumber: quotations.quoteNumber,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(users, eq(invoices.createdById, users.id))
    .leftJoin(quotations, eq(invoices.quotationId, quotations.id))
    .where(whereClause)
    .orderBy(desc(invoices.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const items: InvoiceItem[] = rows.map((r) => {
    const dueDateMs = r.dueDate instanceof Date ? r.dueDate.getTime() : Number(r.dueDate);
    const isOverdue = dueDateMs < now && r.amountDue > 0 && r.status !== "cancelled" && r.status !== "void";
    let effectiveStatus = r.status as InvoiceStatus;
    if (isOverdue && effectiveStatus !== "paid" && effectiveStatus !== "cancelled" && effectiveStatus !== "void") {
      effectiveStatus = "overdue";
    }

    return {
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      customerId: r.customerId,
      quotationId: r.quotationId,
      issueDate: r.issueDate instanceof Date ? r.issueDate.getTime() : Number(r.issueDate),
      dueDate: dueDateMs,
      subtotal: r.subtotal,
      discount: r.discount,
      tax: r.tax,
      total: r.total,
      amountPaid: r.amountPaid,
      amountDue: r.amountDue,
      status: effectiveStatus,
      notes: r.notes,
      terms: r.terms,
      createdById: r.createdById,
      createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : Number(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.getTime() : Number(r.updatedAt),
      isOverdue,
      quotationNumber: r.quoteNumber,
      customer: {
        id: r.customerId,
        name: r.customerName || "Unknown Customer",
        company: r.customerCompany,
        email: r.customerEmail,
        phone: r.customerPhone,
      },
      createdBy: r.createdByName
        ? {
            id: r.createdById,
            name: r.createdByName,
            email: r.createdByEmail || "",
          }
        : null,
    };
  });

  return { items, total, page, limit };
};

/**
 * Find single invoice by ID with items, payments, customer, and quotation info.
 */
export const findInvoiceById = async (id: string): Promise<InvoiceDetail | null> => {
  const inv = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      customerId: invoices.customerId,
      quotationId: invoices.quotationId,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      subtotal: invoices.subtotal,
      discount: invoices.discount,
      tax: invoices.tax,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      amountDue: invoices.amountDue,
      status: invoices.status,
      notes: invoices.notes,
      terms: invoices.terms,
      createdById: invoices.createdById,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      customerName: customers.name,
      customerCompany: customers.company,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerAddress: customers.address,
      createdByName: users.name,
      createdByEmail: users.email,
      quoteNumber: quotations.quoteNumber,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(users, eq(invoices.createdById, users.id))
    .leftJoin(quotations, eq(invoices.quotationId, quotations.id))
    .where(eq(invoices.id, id))
    .get();

  if (!inv) return null;

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .all();

  const paymentRows = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      transactionReference: payments.transactionReference,
      receiptUrl: payments.receiptUrl,
      status: payments.status,
      createdAt: payments.createdAt,
      receivedByName: users.name,
    })
    .from(payments)
    .leftJoin(users, eq(payments.receivedById, users.id))
    .where(eq(payments.invoiceId, id))
    .orderBy(desc(payments.paymentDate))
    .all();

  const now = Date.now();
  const dueDateMs = inv.dueDate instanceof Date ? inv.dueDate.getTime() : Number(inv.dueDate);
  const isOverdue = dueDateMs < now && inv.amountDue > 0 && inv.status !== "cancelled" && inv.status !== "void";
  let effectiveStatus = inv.status as InvoiceStatus;
  if (isOverdue && effectiveStatus !== "paid" && effectiveStatus !== "cancelled" && effectiveStatus !== "void") {
    effectiveStatus = "overdue";
  }

  const paymentSummaries: InvoicePaymentSummary[] = paymentRows.map((p) => ({
    id: p.id,
    amount: p.amount,
    paymentDate: p.paymentDate instanceof Date ? p.paymentDate.getTime() : Number(p.paymentDate),
    paymentMethod: p.paymentMethod,
    transactionReference: p.transactionReference,
    receiptUrl: p.receiptUrl,
    status: p.status,
    receivedByName: p.receivedByName,
    createdAt: p.createdAt instanceof Date ? p.createdAt.getTime() : Number(p.createdAt),
  }));

  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerId: inv.customerId,
    quotationId: inv.quotationId,
    issueDate: inv.issueDate instanceof Date ? inv.issueDate.getTime() : Number(inv.issueDate),
    dueDate: dueDateMs,
    subtotal: inv.subtotal,
    discount: inv.discount,
    tax: inv.tax,
    total: inv.total,
    amountPaid: inv.amountPaid,
    amountDue: inv.amountDue,
    status: effectiveStatus,
    notes: inv.notes,
    terms: inv.terms,
    createdById: inv.createdById,
    createdAt: inv.createdAt instanceof Date ? inv.createdAt.getTime() : Number(inv.createdAt),
    updatedAt: inv.updatedAt instanceof Date ? inv.updatedAt.getTime() : Number(inv.updatedAt),
    isOverdue,
    quotationNumber: inv.quoteNumber,
    items: items.map((it) => ({
      ...it,
      createdAt: it.createdAt instanceof Date ? it.createdAt.getTime() : Number(it.createdAt),
      updatedAt: it.updatedAt instanceof Date ? it.updatedAt.getTime() : Number(it.updatedAt),
    })),
    payments: paymentSummaries,
    customer: {
      id: inv.customerId,
      name: inv.customerName || "Unknown Customer",
      company: inv.customerCompany,
      email: inv.customerEmail,
      phone: inv.customerPhone,
      address: inv.customerAddress,
    },
    createdBy: inv.createdByName
      ? {
          id: inv.createdById,
          name: inv.createdByName,
          email: inv.createdByEmail || "",
        }
      : null,
  };
};

/**
 * Creates invoice and items in an atomic transaction.
 */
export const createInvoiceRecord = async (
  data: {
    customerId: string;
    quotationId?: string | null;
    issueDate: number;
    dueDate: number;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    notes?: string | null;
    terms?: string | null;
    items: InvoiceItemInput[];
  },
  createdById: string
): Promise<InvoiceDetail> => {
  const invoiceId = randomUUID();

  await db.transaction(async (tx) => {
    const invoiceNumber = await generateNextInvoiceNumber(tx);

    await tx.insert(invoices).values({
      id: invoiceId,
      customerId: data.customerId,
      quotationId: data.quotationId || null,
      invoiceNumber,
      issueDate: new Date(data.issueDate),
      dueDate: new Date(data.dueDate),
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
      total: data.total,
      amountPaid: 0,
      amountDue: data.total,
      status: "unpaid",
      notes: data.notes || null,
      terms: data.terms || null,
      createdById,
    });

    for (const item of data.items) {
      const itemTotal = item.quantity * item.unitPrice;
      await tx.insert(invoiceItems).values({
        invoiceId,
        serviceId: item.serviceId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
      });
    }
  });

  const created = await findInvoiceById(invoiceId);
  if (!created) throw new Error("Failed to retrieve created invoice.");
  return created;
};

/**
 * Converts an accepted quotation into an invoice atomically.
 */
export const convertQuotationToInvoiceRecord = async (
  quotationId: string,
  customerId: string,
  dueDate: number,
  notes: string | null,
  terms: string | null,
  createdById: string
): Promise<InvoiceDetail> => {
  const quote = await db
    .select()
    .from(quotations)
    .where(eq(quotations.id, quotationId))
    .get();

  if (!quote) throw new Error("Quotation not found.");

  const quoteItemsList = await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, quotationId))
    .all();

  const invoiceId = randomUUID();

  await db.transaction(async (tx) => {
    const invoiceNumber = await generateNextInvoiceNumber(tx);

    await tx.insert(invoices).values({
      id: invoiceId,
      customerId,
      quotationId,
      invoiceNumber,
      issueDate: new Date(),
      dueDate: new Date(dueDate),
      subtotal: quote.subtotal,
      discount: quote.discount,
      tax: quote.tax,
      total: quote.total,
      amountPaid: 0,
      amountDue: quote.total,
      status: "unpaid",
      notes: notes || quote.notes,
      terms: terms || quote.terms,
      createdById,
    });

    for (const item of quoteItemsList) {
      await tx.insert(invoiceItems).values({
        invoiceId,
        serviceId: item.serviceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
    }

    // Link customer to quotation if it was previously lead-only
    if (!quote.customerId) {
      await tx
        .update(quotations)
        .set({ customerId, updatedAt: new Date() })
        .where(eq(quotations.id, quotationId));
    }
  });

  const created = await findInvoiceById(invoiceId);
  if (!created) throw new Error("Failed to retrieve converted invoice.");
  return created;
};

/**
 * Update invoice details (allowed only when invoice has 0 recorded payments).
 */
export const updateInvoiceRecord = async (
  id: string,
  data: {
    dueDate?: number;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    notes?: string | null;
    terms?: string | null;
    items?: InvoiceItemInput[];
  }
): Promise<InvoiceDetail> => {
  await db.transaction(async (tx) => {
    const updateValues: Record<string, any> = {
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
      total: data.total,
      amountDue: data.total, // Since amountPaid is 0
      updatedAt: new Date(),
    };

    if (data.dueDate) updateValues.dueDate = new Date(data.dueDate);
    if (data.notes !== undefined) updateValues.notes = data.notes;
    if (data.terms !== undefined) updateValues.terms = data.terms;

    await tx.update(invoices).set(updateValues).where(eq(invoices.id, id));

    if (data.items && data.items.length > 0) {
      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

      for (const item of data.items) {
        const itemTotal = item.quantity * item.unitPrice;
        await tx.insert(invoiceItems).values({
          invoiceId: id,
          serviceId: item.serviceId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal,
        });
      }
    }
  });

  const updated = await findInvoiceById(id);
  if (!updated) throw new Error("Failed to retrieve updated invoice.");
  return updated;
};

/**
 * Update invoice status manually (e.g. void / cancelled).
 */
export const updateInvoiceStatusRecord = async (
  id: string,
  status: InvoiceStatus
): Promise<InvoiceDetail> => {
  await db
    .update(invoices)
    .set({ status, updatedAt: new Date() })
    .where(eq(invoices.id, id));

  const updated = await findInvoiceById(id);
  if (!updated) throw new Error("Invoice not found.");
  return updated;
};

/**
 * Aggregates KPIs across all invoices for the authenticated scope.
 */
export const getInvoicesKpis = async (
  visibility?: {
    allowedCustomerIds?: string[];
    isUnrestricted?: boolean;
    userId?: string;
  }
): Promise<InvoiceKpis> => {
  const conditions = [];

  if (visibility && !visibility.isUnrestricted) {
    const visConditions = [];
    if (visibility.userId) visConditions.push(eq(invoices.createdById, visibility.userId));
    if (visibility.allowedCustomerIds && visibility.allowedCustomerIds.length > 0) {
      visConditions.push(inArray(invoices.customerId, visibility.allowedCustomerIds));
    }
    if (visConditions.length > 0) {
      conditions.push(or(...visConditions));
    } else if (visibility.userId) {
      conditions.push(eq(invoices.createdById, visibility.userId));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const allInvoices = await db
    .select({
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      amountDue: invoices.amountDue,
      dueDate: invoices.dueDate,
      status: invoices.status,
    })
    .from(invoices)
    .where(whereClause)
    .all();

  const now = Date.now();
  let totalBilled = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;
  let totalOverdue = 0;
  let unpaidCount = 0;
  let partiallyPaidCount = 0;
  let paidCount = 0;
  let overdueCount = 0;

  for (const inv of allInvoices) {
    if (inv.status === "cancelled" || inv.status === "void") continue;

    totalBilled += inv.total;
    totalCollected += inv.amountPaid;
    totalOutstanding += inv.amountDue;

    const dueDateMs = inv.dueDate instanceof Date ? inv.dueDate.getTime() : Number(inv.dueDate);
    const isOverdue = dueDateMs < now && inv.amountDue > 0;
    if (isOverdue) {
      totalOverdue += inv.amountDue;
      overdueCount++;
    }

    if (inv.status === "paid" || inv.amountDue === 0) {
      paidCount++;
    } else if (inv.amountPaid > 0) {
      partiallyPaidCount++;
    } else {
      unpaidCount++;
    }
  }

  return {
    totalBilled,
    totalCollected,
    totalOutstanding,
    totalOverdue,
    totalInvoices: allInvoices.length,
    unpaidCount,
    partiallyPaidCount,
    paidCount,
    overdueCount,
  };
};
