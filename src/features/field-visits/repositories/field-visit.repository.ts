import { db } from "@/db";
import { fieldVisits, leads, customers, appointments, users } from "@/db/schema";
import { eq, and, or, gte, lte, like, count, sum, desc, SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type {
  FieldVisitQueryInput,
  CreateFieldVisitInput,
  UpdateFieldVisitInput,
  CompleteFieldVisitInput,
  FieldVisitStatus,
  NextActionType,
} from "../schemas/field-visit.schema";
import type { FieldVisitItem, FieldVisitMetrics } from "../types/field-visit.types";

const createdByUsers = alias(users, "createdByUsers");
const assignedToUsers = alias(users, "assignedToUsers");

function mapFieldVisitRow(row: any): FieldVisitItem {
  return {
    id: row.fieldVisits.id,
    leadId: row.fieldVisits.leadId,
    customerId: row.fieldVisits.customerId,
    appointmentId: row.fieldVisits.appointmentId,
    visitDate: new Date(row.fieldVisits.visitDate).getTime(),
    purpose: row.fieldVisits.purpose,
    summary: row.fieldVisits.summary,
    outcome: row.fieldVisits.outcome,
    feedback: row.fieldVisits.feedback,
    requirements: row.fieldVisits.requirements,
    nextAction: row.fieldVisits.nextAction as NextActionType | null,
    nextActionDate: row.fieldVisits.nextActionDate
      ? new Date(row.fieldVisits.nextActionDate).getTime()
      : null,
    expenses: row.fieldVisits.expenses,
    status: row.fieldVisits.status as FieldVisitStatus,
    createdById: row.fieldVisits.createdById,
    assignedToId: row.fieldVisits.assignedToId,
    createdAt: new Date(row.fieldVisits.createdAt).getTime(),
    updatedAt: new Date(row.fieldVisits.updatedAt).getTime(),
    lead: row.leads
      ? {
          id: row.leads.id,
          name: row.leads.name,
          company: row.leads.company,
          phone: row.leads.phone,
          email: row.leads.email,
          requirements: row.leads.requirements,
        }
      : null,
    customer: row.customers
      ? {
          id: row.customers.id,
          name: row.customers.name,
          company: row.customers.company,
          phone: row.customers.phone,
          email: row.customers.email,
          address: row.customers.address,
        }
      : null,
    appointment: row.appointments
      ? {
          id: row.appointments.id,
          title: row.appointments.title,
          startTime: new Date(row.appointments.startTime).getTime(),
          endTime: new Date(row.appointments.endTime).getTime(),
          location: row.appointments.location,
        }
      : null,
    createdBy: row.createdByUsers
      ? {
          id: row.createdByUsers.id,
          name: row.createdByUsers.name,
          email: row.createdByUsers.email,
        }
      : undefined,
    assignedTo: row.assignedToUsers
      ? {
          id: row.assignedToUsers.id,
          name: row.assignedToUsers.name,
          email: row.assignedToUsers.email,
        }
      : undefined,
  };
}

export async function findFieldVisits(
  visibilityFilter: SQL | undefined,
  params: FieldVisitQueryInput
): Promise<{ items: FieldVisitItem[]; total: number }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  const conditions: (SQL | undefined)[] = [visibilityFilter];

  if (params.status && params.status !== "all") {
    conditions.push(eq(fieldVisits.status, params.status));
  }

  if (params.assignedToId) {
    conditions.push(eq(fieldVisits.assignedToId, params.assignedToId));
  }

  if (params.leadId) {
    conditions.push(eq(fieldVisits.leadId, params.leadId));
  }

  if (params.customerId) {
    conditions.push(eq(fieldVisits.customerId, params.customerId));
  }

  if (params.appointmentId) {
    conditions.push(eq(fieldVisits.appointmentId, params.appointmentId));
  }

  if (params.startDate) {
    conditions.push(gte(fieldVisits.visitDate, new Date(params.startDate)));
  }

  if (params.endDate) {
    conditions.push(lte(fieldVisits.visitDate, new Date(params.endDate)));
  }

  if (params.search) {
    const term = `%${params.search}%`;
    conditions.push(
      or(
        like(fieldVisits.purpose, term),
        like(fieldVisits.summary, term),
        like(fieldVisits.outcome, term),
        like(fieldVisits.requirements, term),
        like(leads.name, term),
        like(leads.company, term),
        like(customers.name, term),
        like(customers.company, term)
      )
    );
  }

  const whereClause = and(...conditions.filter(Boolean));

  // Count total matching records
  const [{ totalCount }] = await db
    .select({ totalCount: count() })
    .from(fieldVisits)
    .leftJoin(leads, eq(fieldVisits.leadId, leads.id))
    .leftJoin(customers, eq(fieldVisits.customerId, customers.id))
    .where(whereClause);

  // Query paginated items
  const rows = await db
    .select({
      fieldVisits,
      leads: {
        id: leads.id,
        name: leads.name,
        company: leads.company,
        phone: leads.phone,
        email: leads.email,
        requirements: leads.requirements,
      },
      customers: {
        id: customers.id,
        name: customers.name,
        company: customers.company,
        phone: customers.phone,
        email: customers.email,
        address: customers.address,
      },
      appointments: {
        id: appointments.id,
        title: appointments.title,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        location: appointments.location,
      },
      createdByUsers: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
      },
      assignedToUsers: {
        id: assignedToUsers.id,
        name: assignedToUsers.name,
        email: assignedToUsers.email,
      },
    })
    .from(fieldVisits)
    .leftJoin(leads, eq(fieldVisits.leadId, leads.id))
    .leftJoin(customers, eq(fieldVisits.customerId, customers.id))
    .leftJoin(appointments, eq(fieldVisits.appointmentId, appointments.id))
    .innerJoin(createdByUsers, eq(fieldVisits.createdById, createdByUsers.id))
    .innerJoin(assignedToUsers, eq(fieldVisits.assignedToId, assignedToUsers.id))
    .where(whereClause)
    .orderBy(desc(fieldVisits.visitDate))
    .limit(limit)
    .offset(offset);

  return {
    items: rows.map(mapFieldVisitRow),
    total: totalCount,
  };
}

export async function findFieldVisitById(id: string): Promise<FieldVisitItem | null> {
  const rows = await db
    .select({
      fieldVisits,
      leads: {
        id: leads.id,
        name: leads.name,
        company: leads.company,
        phone: leads.phone,
        email: leads.email,
        requirements: leads.requirements,
      },
      customers: {
        id: customers.id,
        name: customers.name,
        company: customers.company,
        phone: customers.phone,
        email: customers.email,
        address: customers.address,
      },
      appointments: {
        id: appointments.id,
        title: appointments.title,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        location: appointments.location,
      },
      createdByUsers: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
      },
      assignedToUsers: {
        id: assignedToUsers.id,
        name: assignedToUsers.name,
        email: assignedToUsers.email,
      },
    })
    .from(fieldVisits)
    .leftJoin(leads, eq(fieldVisits.leadId, leads.id))
    .leftJoin(customers, eq(fieldVisits.customerId, customers.id))
    .leftJoin(appointments, eq(fieldVisits.appointmentId, appointments.id))
    .innerJoin(createdByUsers, eq(fieldVisits.createdById, createdByUsers.id))
    .innerJoin(assignedToUsers, eq(fieldVisits.assignedToId, assignedToUsers.id))
    .where(eq(fieldVisits.id, id))
    .limit(1);

  if (rows.length === 0) return null;
  return mapFieldVisitRow(rows[0]);
}

export async function createFieldVisitRecord(
  data: CreateFieldVisitInput,
  createdById: string
): Promise<FieldVisitItem> {
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(fieldVisits).values({
    id,
    leadId: data.leadId || null,
    customerId: data.customerId || null,
    appointmentId: data.appointmentId || null,
    visitDate: new Date(data.visitDate),
    purpose: data.purpose,
    summary: data.summary || null,
    outcome: data.outcome || null,
    feedback: data.feedback || null,
    requirements: data.requirements || null,
    expenses: data.expenses ?? 0,
    status: "scheduled",
    createdById,
    assignedToId: data.assignedToId,
    createdAt: now,
    updatedAt: now,
  });

  const created = await findFieldVisitById(id);
  if (!created) {
    throw new Error("Failed to retrieve created field visit");
  }
  return created;
}

export async function updateFieldVisitRecord(
  id: string,
  data: UpdateFieldVisitInput
): Promise<FieldVisitItem> {
  const now = new Date();
  const updateData: Record<string, any> = { updatedAt: now };

  if (data.visitDate !== undefined) updateData.visitDate = new Date(data.visitDate);
  if (data.purpose !== undefined) updateData.purpose = data.purpose;
  if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.outcome !== undefined) updateData.outcome = data.outcome;
  if (data.feedback !== undefined) updateData.feedback = data.feedback;
  if (data.requirements !== undefined) updateData.requirements = data.requirements;
  if (data.nextAction !== undefined) updateData.nextAction = data.nextAction;
  if (data.nextActionDate !== undefined) {
    updateData.nextActionDate = data.nextActionDate ? new Date(data.nextActionDate) : null;
  }
  if (data.expenses !== undefined) updateData.expenses = data.expenses;
  if (data.status !== undefined) updateData.status = data.status;

  await db.update(fieldVisits).set(updateData).where(eq(fieldVisits.id, id));

  const updated = await findFieldVisitById(id);
  if (!updated) {
    throw new Error("Failed to retrieve updated field visit");
  }
  return updated;
}

export async function completeFieldVisitRecord(
  id: string,
  data: CompleteFieldVisitInput
): Promise<FieldVisitItem> {
  const now = new Date();
  const updateData: Record<string, any> = {
    status: "completed",
    updatedAt: now,
  };

  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.outcome !== undefined) updateData.outcome = data.outcome;
  if (data.feedback !== undefined) updateData.feedback = data.feedback;
  if (data.requirements !== undefined) updateData.requirements = data.requirements;
  if (data.expenses !== undefined) updateData.expenses = data.expenses;
  if (data.nextAction !== undefined) updateData.nextAction = data.nextAction;
  if (data.nextActionDate !== undefined) {
    updateData.nextActionDate = data.nextActionDate ? new Date(data.nextActionDate) : null;
  }

  await db.update(fieldVisits).set(updateData).where(eq(fieldVisits.id, id));

  const updated = await findFieldVisitById(id);
  if (!updated) {
    throw new Error("Failed to retrieve completed field visit");
  }
  return updated;
}

export async function getFieldVisitMetrics(
  visibilityFilter: SQL | undefined,
  params?: FieldVisitQueryInput
): Promise<FieldVisitMetrics> {
  const conditions: (SQL | undefined)[] = [visibilityFilter];

  if (params?.leadId) {
    conditions.push(eq(fieldVisits.leadId, params.leadId));
  }

  if (params?.customerId) {
    conditions.push(eq(fieldVisits.customerId, params.customerId));
  }

  if (params?.assignedToId) {
    conditions.push(eq(fieldVisits.assignedToId, params.assignedToId));
  }

  if (params?.startDate) {
    conditions.push(gte(fieldVisits.visitDate, new Date(params.startDate)));
  }

  if (params?.endDate) {
    conditions.push(lte(fieldVisits.visitDate, new Date(params.endDate)));
  }

  const whereClause = and(...conditions.filter(Boolean));

  // Query status counts
  const statusRows = await db
    .select({
      status: fieldVisits.status,
      count: count(),
    })
    .from(fieldVisits)
    .leftJoin(leads, eq(fieldVisits.leadId, leads.id))
    .leftJoin(customers, eq(fieldVisits.customerId, customers.id))
    .where(whereClause)
    .groupBy(fieldVisits.status);

  // Query total expenses sum
  const [{ totalExpenses }] = await db
    .select({ totalExpenses: sum(fieldVisits.expenses) })
    .from(fieldVisits)
    .leftJoin(leads, eq(fieldVisits.leadId, leads.id))
    .leftJoin(customers, eq(fieldVisits.customerId, customers.id))
    .where(whereClause);

  // Query nextActions distribution
  const nextActionRows = await db
    .select({
      nextAction: fieldVisits.nextAction,
      count: count(),
    })
    .from(fieldVisits)
    .leftJoin(leads, eq(fieldVisits.leadId, leads.id))
    .leftJoin(customers, eq(fieldVisits.customerId, customers.id))
    .where(whereClause)
    .groupBy(fieldVisits.nextAction);

  const metrics: FieldVisitMetrics = {
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    totalExpenses: Number(totalExpenses ?? 0),
    nextActionsBreakdown: {
      follow_up: 0,
      proposal: 0,
      second_visit: 0,
      negotiation: 0,
      won: 0,
      lost: 0,
    },
  };

  for (const row of statusRows) {
    const num = row.count;
    metrics.total += num;
    if (row.status === "scheduled") metrics.scheduled = num;
    if (row.status === "completed") metrics.completed = num;
    if (row.status === "cancelled") metrics.cancelled = num;
  }

  for (const row of nextActionRows) {
    if (row.nextAction && row.nextAction in metrics.nextActionsBreakdown) {
      metrics.nextActionsBreakdown[row.nextAction as NextActionType] = row.count;
    }
  }

  return metrics;
}
