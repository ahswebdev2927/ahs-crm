import { db } from "@/db";
import { quotations, quotationItems, leads, customers, users } from "@/db/schema";
import { eq, and, or, sql, like, inArray, gte, lte, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import type {
  QuotationItem,
  QuotationDetail,
  QuotationKpis,
  QuotationStatus,
} from "../types/quotation.types";
import type { QuotationItemInput } from "../schemas/quotation.schema";

/**
 * Generates a standard chronological sequential quote number: QT-YYYYMM-XXXX
 */
export const generateNextQuoteNumber = async (): Promise<string> => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `QT-${yearMonth}-`;

  const existingQuotes = await db
    .select({ quoteNumber: quotations.quoteNumber })
    .from(quotations)
    .where(like(quotations.quoteNumber, `${prefix}%`))
    .all();

  let maxSequence = 0;
  for (const q of existingQuotes) {
    const parts = q.quoteNumber.split("-");
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
 * Find quotations with pagination, filtering, search, and data visibility scoping.
 */
export const findQuotations = async (
  params: {
    page: number;
    limit: number;
    status?: string;
    leadId?: string;
    customerId?: string;
    search?: string;
    dateFrom?: number;
    dateTo?: number;
  },
  visibility?: {
    allowedLeadIds?: string[];
    allowedCustomerIds?: string[];
    isUnrestricted?: boolean;
    userId?: string;
  }
): Promise<{ items: QuotationItem[]; total: number; page: number; limit: number }> => {
  const { page, limit, status, leadId, customerId, search, dateFrom, dateTo } = params;
  const offset = (page - 1) * limit;

  const conditions = [];

  // Status Filter
  if (status && status !== "all") {
    conditions.push(eq(quotations.status, status as any));
  }

  // Lead / Customer ID Filter
  if (leadId) {
    conditions.push(eq(quotations.leadId, leadId));
  }
  if (customerId) {
    conditions.push(eq(quotations.customerId, customerId));
  }

  // Date range filter
  if (dateFrom) {
    conditions.push(gte(quotations.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    conditions.push(lte(quotations.createdAt, new Date(dateTo)));
  }

  // Visibility Scope: If not unrestricted (Admin/Manager), filter by owned records or accessible leads/customers
  if (visibility && !visibility.isUnrestricted) {
    const visConditions = [];
    if (visibility.userId) {
      visConditions.push(eq(quotations.createdById, visibility.userId));
    }
    if (visibility.allowedLeadIds && visibility.allowedLeadIds.length > 0) {
      visConditions.push(inArray(quotations.leadId, visibility.allowedLeadIds));
    }
    if (visibility.allowedCustomerIds && visibility.allowedCustomerIds.length > 0) {
      visConditions.push(inArray(quotations.customerId, visibility.allowedCustomerIds));
    }

    if (visConditions.length > 0) {
      conditions.push(or(...visConditions));
    } else if (visibility.userId) {
      conditions.push(eq(quotations.createdById, visibility.userId));
    }
  }

  // Search Filter: quoteNumber, notes
  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    conditions.push(or(like(quotations.quoteNumber, term), like(quotations.notes, term)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Total count
  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(quotations)
    .where(whereClause)
    .get();
  const total = Number(countRes?.count ?? 0);

  // Rows query with joins for client names
  const rows = await db
    .select({
      id: quotations.id,
      quoteNumber: quotations.quoteNumber,
      leadId: quotations.leadId,
      customerId: quotations.customerId,
      validUntil: quotations.validUntil,
      subtotal: quotations.subtotal,
      discount: quotations.discount,
      tax: quotations.tax,
      total: quotations.total,
      status: quotations.status,
      notes: quotations.notes,
      terms: quotations.terms,
      sentAt: quotations.sentAt,
      acceptedAt: quotations.acceptedAt,
      declinedAt: quotations.declinedAt,
      createdById: quotations.createdById,
      createdAt: quotations.createdAt,
      updatedAt: quotations.updatedAt,
      leadName: leads.name,
      leadCompany: leads.company,
      leadEmail: leads.email,
      leadPhone: leads.phone,
      customerName: customers.name,
      customerCompany: customers.company,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      createdByName: users.name,
      createdByEmail: users.email,
    })
    .from(quotations)
    .leftJoin(leads, eq(quotations.leadId, leads.id))
    .leftJoin(customers, eq(quotations.customerId, customers.id))
    .leftJoin(users, eq(quotations.createdById, users.id))
    .where(whereClause)
    .orderBy(desc(quotations.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const items: QuotationItem[] = rows.map((r) => ({
    id: r.id,
    quoteNumber: r.quoteNumber,
    leadId: r.leadId,
    customerId: r.customerId,
    validUntil: r.validUntil instanceof Date ? r.validUntil.getTime() : Number(r.validUntil),
    subtotal: r.subtotal,
    discount: r.discount,
    tax: r.tax,
    total: r.total,
    status: r.status as QuotationStatus,
    notes: r.notes,
    terms: r.terms,
    sentAt: r.sentAt ? (r.sentAt instanceof Date ? r.sentAt.getTime() : Number(r.sentAt)) : null,
    acceptedAt: r.acceptedAt ? (r.acceptedAt instanceof Date ? r.acceptedAt.getTime() : Number(r.acceptedAt)) : null,
    declinedAt: r.declinedAt ? (r.declinedAt instanceof Date ? r.declinedAt.getTime() : Number(r.declinedAt)) : null,
    createdById: r.createdById,
    createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : Number(r.createdAt),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.getTime() : Number(r.updatedAt),
    lead: r.leadId
      ? {
          id: r.leadId,
          name: r.leadName || "Unknown Lead",
          company: r.leadCompany,
          email: r.leadEmail,
          phone: r.leadPhone,
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
    createdBy: r.createdByName
      ? {
          id: r.createdById,
          name: r.createdByName,
          email: r.createdByEmail || "",
        }
      : null,
  }));

  return { items, total, page, limit };
};

/**
 * Find single quotation by ID with its line items and relations.
 */
export const findQuotationById = async (id: string): Promise<QuotationDetail | null> => {
  const quote = await db
    .select({
      id: quotations.id,
      quoteNumber: quotations.quoteNumber,
      leadId: quotations.leadId,
      customerId: quotations.customerId,
      validUntil: quotations.validUntil,
      subtotal: quotations.subtotal,
      discount: quotations.discount,
      tax: quotations.tax,
      total: quotations.total,
      status: quotations.status,
      notes: quotations.notes,
      terms: quotations.terms,
      sentAt: quotations.sentAt,
      acceptedAt: quotations.acceptedAt,
      declinedAt: quotations.declinedAt,
      createdById: quotations.createdById,
      createdAt: quotations.createdAt,
      updatedAt: quotations.updatedAt,
      leadName: leads.name,
      leadCompany: leads.company,
      leadEmail: leads.email,
      leadPhone: leads.phone,
      leadAddress: sql<string | null>`null`,
      customerName: customers.name,
      customerCompany: customers.company,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerAddress: customers.address,
      createdByName: users.name,
      createdByEmail: users.email,
    })
    .from(quotations)
    .leftJoin(leads, eq(quotations.leadId, leads.id))
    .leftJoin(customers, eq(quotations.customerId, customers.id))
    .leftJoin(users, eq(quotations.createdById, users.id))
    .where(eq(quotations.id, id))
    .get();

  if (!quote) return null;

  const items = await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, id))
    .all();

  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    leadId: quote.leadId,
    customerId: quote.customerId,
    validUntil: quote.validUntil instanceof Date ? quote.validUntil.getTime() : Number(quote.validUntil),
    subtotal: quote.subtotal,
    discount: quote.discount,
    tax: quote.tax,
    total: quote.total,
    status: quote.status as QuotationStatus,
    notes: quote.notes,
    terms: quote.terms,
    sentAt: quote.sentAt ? (quote.sentAt instanceof Date ? quote.sentAt.getTime() : Number(quote.sentAt)) : null,
    acceptedAt: quote.acceptedAt ? (quote.acceptedAt instanceof Date ? quote.acceptedAt.getTime() : Number(quote.acceptedAt)) : null,
    declinedAt: quote.declinedAt ? (quote.declinedAt instanceof Date ? quote.declinedAt.getTime() : Number(quote.declinedAt)) : null,
    createdById: quote.createdById,
    createdAt: quote.createdAt instanceof Date ? quote.createdAt.getTime() : Number(quote.createdAt),
    updatedAt: quote.updatedAt instanceof Date ? quote.updatedAt.getTime() : Number(quote.updatedAt),
    items: items.map((it) => ({
      ...it,
      createdAt: it.createdAt instanceof Date ? it.createdAt.getTime() : Number(it.createdAt),
      updatedAt: it.updatedAt instanceof Date ? it.updatedAt.getTime() : Number(it.updatedAt),
    })),
    lead: quote.leadId
      ? {
          id: quote.leadId,
          name: quote.leadName || "Unknown Lead",
          company: quote.leadCompany,
          email: quote.leadEmail,
          phone: quote.leadPhone,
          address: quote.leadAddress,
        }
      : null,
    customer: quote.customerId
      ? {
          id: quote.customerId,
          name: quote.customerName || "Unknown Customer",
          company: quote.customerCompany,
          email: quote.customerEmail,
          phone: quote.customerPhone,
          address: quote.customerAddress,
        }
      : null,
    createdBy: quote.createdByName
      ? {
          id: quote.createdById,
          name: quote.createdByName,
          email: quote.createdByEmail || "",
        }
      : null,
  };
};

/**
 * Creates quotation and line items atomically in a transaction.
 */
export const createQuotationRecord = async (
  data: {
    leadId?: string | null;
    customerId?: string | null;
    validUntil: number;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    notes?: string | null;
    terms?: string | null;
    items: QuotationItemInput[];
  },
  createdById: string
): Promise<QuotationDetail> => {
  const quotationId = randomUUID();
  const quoteNumber = await generateNextQuoteNumber();

  await db.transaction(async (tx) => {
    await tx.insert(quotations).values({
      id: quotationId,
      quoteNumber,
      leadId: data.leadId || null,
      customerId: data.customerId || null,
      validUntil: new Date(data.validUntil),
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
      total: data.total,
      status: "draft",
      notes: data.notes || null,
      terms: data.terms || null,
      createdById,
    });

    for (const item of data.items) {
      const itemTotal = item.quantity * item.unitPrice;
      await tx.insert(quotationItems).values({
        quotationId,
        serviceId: item.serviceId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
      });
    }
  });

  const created = await findQuotationById(quotationId);
  if (!created) {
    throw new Error("Failed to retrieve created quotation.");
  }
  return created;
};

/**
 * Updates quotation record and updates/replaces line items.
 */
export const updateQuotationRecord = async (
  id: string,
  data: {
    validUntil?: number;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    notes?: string | null;
    terms?: string | null;
    items?: QuotationItemInput[];
  }
): Promise<QuotationDetail> => {
  await db.transaction(async (tx) => {
    const updateValues: Record<string, any> = {
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
      total: data.total,
      updatedAt: new Date(),
    };

    if (data.validUntil) updateValues.validUntil = new Date(data.validUntil);
    if (data.notes !== undefined) updateValues.notes = data.notes;
    if (data.terms !== undefined) updateValues.terms = data.terms;

    await tx.update(quotations).set(updateValues).where(eq(quotations.id, id));

    if (data.items && data.items.length > 0) {
      await tx.delete(quotationItems).where(eq(quotationItems.quotationId, id));

      for (const item of data.items) {
        const itemTotal = item.quantity * item.unitPrice;
        await tx.insert(quotationItems).values({
          quotationId: id,
          serviceId: item.serviceId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal,
        });
      }
    }
  });

  const updated = await findQuotationById(id);
  if (!updated) {
    throw new Error("Failed to retrieve updated quotation.");
  }
  return updated;
};

/**
 * Update quotation status and transition timestamps.
 */
export const updateQuotationStatusRecord = async (
  id: string,
  status: QuotationStatus
): Promise<QuotationDetail> => {
  const updateValues: Record<string, any> = {
    status,
    updatedAt: new Date(),
  };

  if (status === "sent") {
    updateValues.sentAt = new Date();
  } else if (status === "accepted") {
    updateValues.acceptedAt = new Date();
  } else if (status === "declined") {
    updateValues.declinedAt = new Date();
  }

  await db.update(quotations).set(updateValues).where(eq(quotations.id, id));

  const updated = await findQuotationById(id);
  if (!updated) throw new Error("Quotation not found.");
  return updated;
};

/**
 * Aggregates Quotations KPIs for dashboard and management metrics.
 */
export const getQuotationsKpis = async (
  visibility?: {
    allowedLeadIds?: string[];
    allowedCustomerIds?: string[];
    isUnrestricted?: boolean;
    userId?: string;
  }
): Promise<QuotationKpis> => {
  const conditions = [];

  if (visibility && !visibility.isUnrestricted) {
    const visConditions = [];
    if (visibility.userId) visConditions.push(eq(quotations.createdById, visibility.userId));
    if (visibility.allowedLeadIds && visibility.allowedLeadIds.length > 0) {
      visConditions.push(inArray(quotations.leadId, visibility.allowedLeadIds));
    }
    if (visibility.allowedCustomerIds && visibility.allowedCustomerIds.length > 0) {
      visConditions.push(inArray(quotations.customerId, visibility.allowedCustomerIds));
    }
    if (visConditions.length > 0) {
      conditions.push(or(...visConditions));
    } else if (visibility.userId) {
      conditions.push(eq(quotations.createdById, visibility.userId));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const allQuotes = await db
    .select({
      status: quotations.status,
      total: quotations.total,
      validUntil: quotations.validUntil,
    })
    .from(quotations)
    .where(whereClause)
    .all();

  const now = Date.now();
  let draftCount = 0;
  let sentCount = 0;
  let acceptedCount = 0;
  let declinedCount = 0;
  let expiredCount = 0;
  let totalPipelineValue = 0;
  let acceptedValue = 0;

  for (const q of allQuotes) {
    let currentStatus = q.status as QuotationStatus;
    const validUntilMs = q.validUntil instanceof Date ? q.validUntil.getTime() : Number(q.validUntil);
    if (currentStatus === "sent" && validUntilMs < now) {
      currentStatus = "expired";
    }

    switch (currentStatus) {
      case "draft":
        draftCount++;
        totalPipelineValue += q.total;
        break;
      case "sent":
      case "viewed":
        sentCount++;
        totalPipelineValue += q.total;
        break;
      case "accepted":
        acceptedCount++;
        acceptedValue += q.total;
        break;
      case "declined":
        declinedCount++;
        break;
      case "expired":
        expiredCount++;
        break;
    }
  }

  return {
    totalQuotations: allQuotes.length,
    draftCount,
    sentCount,
    acceptedCount,
    declinedCount,
    expiredCount,
    totalPipelineValue,
    acceptedValue,
  };
};
