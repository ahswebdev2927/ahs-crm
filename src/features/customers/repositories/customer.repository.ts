import { db } from "@/db";
import { eq, and, or, like, sql, desc, asc, count, isNull, isNotNull, SQL } from "drizzle-orm";
import {
  customers,
  leads,
  users,
  leadStages,
  appointments,
  followUps,
  fieldVisits,
  quotations,
  customerServices,
  invoices,
  attachments,
  leadActivities,
} from "@/db/schema";
import type {
  CustomerItem,
  CustomerDetail,
  CustomerStats,
  CustomerStatus,
  CustomerOrigin,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryOutput,
} from "../types/customer.types";

/**
 * Customer Repository
 * Handles all database operations for Customers, direct creation,
 * atomic lead-to-customer conversion, filtering, and joined statistics.
 */

export interface CustomerInsertData extends CreateCustomerInput {
  id: string;
  leadId?: string | null;
  ownerId?: string | null;
}

export const findCustomers = async (
  visibilityFilter: SQL | undefined,
  params: CustomerQueryOutput
): Promise<{ items: CustomerItem[]; total: number }> => {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];

  if (visibilityFilter) {
    conditions.push(visibilityFilter);
  }

  // Soft delete filter
  conditions.push(isNull(customers.deletedAt));

  // Status filter
  if (params.status && params.status !== "all") {
    conditions.push(eq(customers.status, params.status as CustomerStatus));
  }

  // Origin filter
  if (params.origin === "direct") {
    conditions.push(isNull(customers.leadId));
  } else if (params.origin === "converted") {
    conditions.push(isNotNull(customers.leadId));
  }

  // Owner filter
  if (params.ownerId && params.ownerId.trim() !== "") {
    conditions.push(eq(customers.ownerId, params.ownerId.trim()));
  }

  // Multi-column search
  if (params.search && params.search.trim() !== "") {
    const term = `%${params.search.trim()}%`;
    conditions.push(
      or(
        like(customers.name, term),
        like(customers.company, term),
        like(customers.phone, term),
        like(customers.email, term)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total records
  const totalResult = await db
    .select({ total: count() })
    .from(customers)
    .where(whereClause);

  const total = totalResult[0]?.total ?? 0;

  // Sorting
  const sortColumn =
    params.sortBy === "name"
      ? customers.name
      : params.sortBy === "company"
      ? customers.company
      : params.sortBy === "status"
      ? customers.status
      : params.sortBy === "updatedAt"
      ? customers.updatedAt
      : customers.createdAt;

  const orderExpr = params.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

  // Query records joined with owner
  const rows = await db
    .select({
      customer: customers,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(customers)
    .leftJoin(users, eq(customers.ownerId, users.id))
    .where(whereClause)
    .orderBy(orderExpr)
    .limit(limit)
    .offset(offset);

  const items: CustomerItem[] = rows.map((r) => ({
    id: r.customer.id,
    name: r.customer.name,
    company: r.customer.company,
    phone: r.customer.phone,
    email: r.customer.email,
    address: r.customer.address,
    status: r.customer.status as CustomerStatus,
    leadId: r.customer.leadId,
    ownerId: r.customer.ownerId,
    owner: r.owner?.id ? r.owner : null,
    origin: r.customer.leadId ? "converted" : "direct",
    createdAt: new Date(r.customer.createdAt),
    updatedAt: new Date(r.customer.updatedAt),
    deletedAt: r.customer.deletedAt ? new Date(r.customer.deletedAt) : null,
  }));

  return { items, total };
};

export const findCustomerById = async (id: string): Promise<CustomerDetail | null> => {
  const row = await db
    .select({
      customer: customers,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      lead: {
        id: leads.id,
        name: leads.name,
        company: leads.company,
        status: leads.status,
      },
      stage: {
        name: leadStages.name,
      },
    })
    .from(customers)
    .leftJoin(users, eq(customers.ownerId, users.id))
    .leftJoin(leads, eq(customers.leadId, leads.id))
    .leftJoin(leadStages, eq(leads.stageId, leadStages.id))
    .where(and(eq(customers.id, id), isNull(customers.deletedAt)))
    .get();

  if (!row) return null;

  // Aggregate stats across linked modules
  const [
    apptCount,
    followUpCount,
    visitCount,
    quoteCount,
    svcCount,
    invStats,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(appointments)
      .where(eq(appointments.customerId, id)),
    db
      .select({ count: count() })
      .from(followUps)
      .where(eq(followUps.customerId, id)),
    db
      .select({ count: count() })
      .from(fieldVisits)
      .where(eq(fieldVisits.customerId, id)),
    db
      .select({ count: count() })
      .from(quotations)
      .where(eq(quotations.customerId, id)),
    db
      .select({ count: count() })
      .from(customerServices)
      .where(eq(customerServices.customerId, id)),
    db
      .select({
        totalInvoices: count(),
        paid: sql<number>`COALESCE(SUM(${invoices.amountPaid}), 0)`,
        due: sql<number>`COALESCE(SUM(${invoices.amountDue}), 0)`,
      })
      .from(invoices)
      .where(eq(invoices.customerId, id)),
  ]);

  const stats: CustomerStats = {
    totalAppointments: apptCount[0]?.count ?? 0,
    totalFollowUps: followUpCount[0]?.count ?? 0,
    totalFieldVisits: visitCount[0]?.count ?? 0,
    totalQuotations: quoteCount[0]?.count ?? 0,
    totalCustomerServices: svcCount[0]?.count ?? 0,
    totalInvoices: invStats[0]?.totalInvoices ?? 0,
    totalPaidCents: Number(invStats[0]?.paid ?? 0),
    totalOutstandingCents: Number(invStats[0]?.due ?? 0),
  };

  return {
    id: row.customer.id,
    name: row.customer.name,
    company: row.customer.company,
    phone: row.customer.phone,
    email: row.customer.email,
    address: row.customer.address,
    status: row.customer.status as CustomerStatus,
    leadId: row.customer.leadId,
    ownerId: row.customer.ownerId,
    owner: row.owner?.id ? row.owner : null,
    origin: row.customer.leadId ? "converted" : "direct",
    createdAt: new Date(row.customer.createdAt),
    updatedAt: new Date(row.customer.updatedAt),
    deletedAt: row.customer.deletedAt ? new Date(row.customer.deletedAt) : null,
    lead: row.lead?.id
      ? {
          id: row.lead.id,
          name: row.lead.name,
          company: row.lead.company,
          status: row.lead.status,
          stageName: row.stage?.name ?? null,
        }
      : null,
    stats,
  };
};

export const createCustomerRecord = async (
  data: CustomerInsertData
): Promise<CustomerItem> => {
  const newId = data.id || crypto.randomUUID();
  const now = new Date();

  await db.insert(customers).values({
    id: newId,
    leadId: data.leadId ?? null,
    name: data.name,
    company: data.company ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    address: data.address ?? null,
    status: data.status ?? "active",
    ownerId: data.ownerId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const created = await findCustomerById(newId);
  if (!created) {
    throw new Error("Failed to retrieve created customer.");
  }
  return created;
};

export const updateCustomerRecord = async (
  id: string,
  data: UpdateCustomerInput
): Promise<CustomerDetail> => {
  const updates: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updates.name = data.name;
  if (data.company !== undefined) updates.company = data.company;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.email !== undefined) updates.email = data.email;
  if (data.address !== undefined) updates.address = data.address;
  if (data.status !== undefined) updates.status = data.status;
  if (data.ownerId !== undefined) updates.ownerId = data.ownerId;

  await db.update(customers).set(updates).where(eq(customers.id, id));

  const updated = await findCustomerById(id);
  if (!updated) {
    throw new Error("Failed to retrieve updated customer.");
  }
  return updated;
};

/**
 * Executes atomic conversion of a lead into a customer record.
 * Transfers / links all historical follow-ups, appointments, visits,
 * quotations, and attachments to the newly created customer.
 */
export const convertLeadTransaction = async (
  leadId: string,
  customerData: {
    name?: string;
    company?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    ownerId?: string | null;
    notes?: string | null;
  },
  userId: string
): Promise<CustomerDetail> => {
  const customerId = crypto.randomUUID();
  const now = new Date();

  // Fetch lead to populate default fields
  const lead = await db
    .select()
    .from(leads)
    .where(eq(leads.id, leadId))
    .get();

  if (!lead) {
    throw new Error("Lead not found for conversion.");
  }

  const finalName = customerData.name || lead.name;
  const finalCompany = customerData.company !== undefined ? customerData.company : lead.company;
  const finalPhone = customerData.phone !== undefined ? customerData.phone : lead.phone;
  const finalEmail = customerData.email !== undefined ? customerData.email : lead.email;
  const finalOwnerId = customerData.ownerId || lead.ownerId || userId;

  // Execute in SQLite / libSQL transaction
  await db.transaction(async (tx) => {
    // 1. Create customer record linked to leadId
    await tx.insert(customers).values({
      id: customerId,
      leadId: lead.id,
      name: finalName,
      company: finalCompany,
      phone: finalPhone,
      email: finalEmail,
      address: customerData.address ?? null,
      status: "active",
      ownerId: finalOwnerId,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Link existing follow-ups to customer
    await tx
      .update(followUps)
      .set({ customerId, updatedAt: now })
      .where(eq(followUps.leadId, leadId));

    // 3. Link existing appointments to customer
    await tx
      .update(appointments)
      .set({ customerId, updatedAt: now })
      .where(eq(appointments.leadId, leadId));

    // 4. Link existing field visits to customer
    await tx
      .update(fieldVisits)
      .set({ customerId, updatedAt: now })
      .where(eq(fieldVisits.leadId, leadId));

    // 5. Link existing attachments to customer
    await tx
      .update(attachments)
      .set({ customerId, updatedAt: now })
      .where(eq(attachments.leadId, leadId));

    // 6. Link existing quotations to customer
    await tx
      .update(quotations)
      .set({ customerId, updatedAt: now })
      .where(eq(quotations.leadId, leadId));

    // 7. Log lead activity recording the conversion
    await tx.insert(leadActivities).values({
      id: crypto.randomUUID(),
      leadId: lead.id,
      type: "note",
      content: `Lead successfully converted to Customer: ${finalName}${
        customerData.notes ? ` (${customerData.notes})` : ""
      }`,
      createdById: userId,
      createdAt: now,
    });
  });

  const convertedCustomer = await findCustomerById(customerId);
  if (!convertedCustomer) {
    throw new Error("Failed to load converted customer record.");
  }
  return convertedCustomer;
};
