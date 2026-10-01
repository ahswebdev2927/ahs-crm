import { db } from "@/db";
import { appointments, leads, customers, users, roles } from "@/db/schema";
import { eq, and, or, gte, lte, like, count, desc, SQL } from "drizzle-orm";
import type { AppointmentQueryInput, CreateAppointmentInput, UpdateAppointmentInput, AppointmentStatus } from "../schemas/appointment.schema";
import type { AppointmentItem, AppointmentWithVisit, AppointmentMetrics, FieldSalesUser } from "../types/appointment.types";
import { findFieldVisitByAppointmentId } from "@/features/field-visits/repositories/field-visit.repository";
import { alias } from "drizzle-orm/sqlite-core";

const createdByUsers = alias(users, "createdByUsers");
const assignedToUsers = alias(users, "assignedToUsers");

function mapAppointmentRow(row: any): AppointmentItem {
  return {
    id: row.appointments.id,
    title: row.appointments.title,
    description: row.appointments.description,
    startTime: new Date(row.appointments.startTime),
    endTime: new Date(row.appointments.endTime),
    location: row.appointments.location,
    status: row.appointments.status as AppointmentStatus,
    rescheduleReason: row.appointments.rescheduleReason,
    cancellationReason: row.appointments.cancellationReason,
    leadId: row.appointments.leadId,
    customerId: row.appointments.customerId,
    createdById: row.appointments.createdById,
    assignedToId: row.appointments.assignedToId,
    createdAt: new Date(row.appointments.createdAt),
    updatedAt: new Date(row.appointments.updatedAt),
    lead: row.leads
      ? {
          id: row.leads.id,
          contactName: row.leads.name,
          companyName: row.leads.company,
          email: row.leads.email,
          phone: row.leads.phone,
        }
      : null,
    customer: row.customers
      ? {
          id: row.customers.id,
          name: row.customers.name,
          email: row.customers.email,
          phone: row.customers.phone,
        }
      : null,
    createdBy: {
      id: row.createdByUsers.id,
      name: row.createdByUsers.name,
      email: row.createdByUsers.email,
    },
    assignedTo: {
      id: row.assignedToUsers.id,
      name: row.assignedToUsers.name,
      email: row.assignedToUsers.email,
    },
  };
}

export async function findAppointments(
  visibilityFilter: SQL | undefined,
  params: AppointmentQueryInput
): Promise<{ items: AppointmentItem[]; total: number }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  const conditions: (SQL | undefined)[] = [visibilityFilter];

  if (params.status && params.status !== "all") {
    conditions.push(eq(appointments.status, params.status));
  }

  if (params.assignedToId) {
    conditions.push(eq(appointments.assignedToId, params.assignedToId));
  }

  if (params.leadId) {
    conditions.push(eq(appointments.leadId, params.leadId));
  }

  if (params.customerId) {
    conditions.push(eq(appointments.customerId, params.customerId));
  }

  if (params.startDate) {
    conditions.push(gte(appointments.startTime, new Date(params.startDate)));
  }

  if (params.endDate) {
    conditions.push(lte(appointments.startTime, new Date(params.endDate)));
  }

  if (params.search) {
    const term = `%${params.search}%`;
    conditions.push(
      or(
        like(appointments.title, term),
        like(appointments.location, term),
        like(leads.name, term),
        like(leads.company, term),
        like(customers.name, term)
      )
    );
  }

  const whereClause = and(...conditions.filter(Boolean));

  // Count total matching items
  const [{ totalCount }] = await db
    .select({ totalCount: count() })
    .from(appointments)
    .leftJoin(leads, eq(appointments.leadId, leads.id))
    .leftJoin(customers, eq(appointments.customerId, customers.id))
    .where(whereClause);

  // Query paginated items
  const rows = await db
    .select({
      appointments,
      leads: {
        id: leads.id,
        name: leads.name,
        company: leads.company,
        email: leads.email,
        phone: leads.phone,
      },
      customers: {
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
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
    .from(appointments)
    .leftJoin(leads, eq(appointments.leadId, leads.id))
    .leftJoin(customers, eq(appointments.customerId, customers.id))
    .innerJoin(createdByUsers, eq(appointments.createdById, createdByUsers.id))
    .innerJoin(assignedToUsers, eq(appointments.assignedToId, assignedToUsers.id))
    .where(whereClause)
    .orderBy(desc(appointments.startTime))
    .limit(limit)
    .offset(offset);

  return {
    items: rows.map(mapAppointmentRow),
    total: totalCount,
  };
}

export async function findAppointmentById(id: string): Promise<AppointmentItem | null> {
  const rows = await db
    .select({
      appointments,
      leads: {
        id: leads.id,
        name: leads.name,
        company: leads.company,
        email: leads.email,
        phone: leads.phone,
      },
      customers: {
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
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
    .from(appointments)
    .leftJoin(leads, eq(appointments.leadId, leads.id))
    .leftJoin(customers, eq(appointments.customerId, customers.id))
    .innerJoin(createdByUsers, eq(appointments.createdById, createdByUsers.id))
    .innerJoin(assignedToUsers, eq(appointments.assignedToId, assignedToUsers.id))
    .where(eq(appointments.id, id))
    .limit(1);

  if (rows.length === 0) return null;
  return mapAppointmentRow(rows[0]);
}

export async function createAppointmentRecord(
  data: CreateAppointmentInput,
  createdById: string
): Promise<AppointmentItem> {
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(appointments).values({
    id,
    title: data.title,
    leadId: data.leadId || null,
    customerId: data.customerId || null,
    startTime: new Date(data.startTime),
    endTime: new Date(data.endTime),
    location: data.location || null,
    description: data.description || null,
    status: "scheduled",
    createdById,
    assignedToId: data.assignedToId,
    createdAt: now,
    updatedAt: now,
  });

  const created = await findAppointmentById(id);
  if (!created) {
    throw new Error("Failed to retrieve created appointment");
  }
  return created;
}

export async function updateAppointmentRecord(
  id: string,
  data: UpdateAppointmentInput
): Promise<AppointmentItem> {
  const now = new Date();
  const updateData: Record<string, any> = { updatedAt: now };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
  if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
  if (data.location !== undefined) updateData.location = data.location;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;

  await db.update(appointments).set(updateData).where(eq(appointments.id, id));

  const updated = await findAppointmentById(id);
  if (!updated) {
    throw new Error("Failed to retrieve updated appointment");
  }
  return updated;
}

export async function updateAppointmentStatusRecord(
  id: string,
  status: AppointmentStatus,
  extra?: { rescheduleReason?: string; cancellationReason?: string; startTime?: number; endTime?: number; notes?: string }
): Promise<AppointmentItem> {
  const now = new Date();
  const updateData: Record<string, any> = {
    status,
    updatedAt: now,
  };

  if (extra?.rescheduleReason) updateData.rescheduleReason = extra.rescheduleReason;
  if (extra?.cancellationReason) updateData.cancellationReason = extra.cancellationReason;
  if (extra?.startTime) updateData.startTime = new Date(extra.startTime);
  if (extra?.endTime) updateData.endTime = new Date(extra.endTime);
  if (extra?.notes) updateData.description = extra.notes;

  await db.update(appointments).set(updateData).where(eq(appointments.id, id));

  const updated = await findAppointmentById(id);
  if (!updated) {
    throw new Error("Failed to retrieve updated appointment status");
  }
  return updated;
}

export async function getAppointmentMetrics(
  visibilityFilter: SQL | undefined,
  params?: AppointmentQueryInput
): Promise<AppointmentMetrics> {
  const conditions: (SQL | undefined)[] = [visibilityFilter];

  if (params?.leadId) {
    conditions.push(eq(appointments.leadId, params.leadId));
  }

  if (params?.customerId) {
    conditions.push(eq(appointments.customerId, params.customerId));
  }

  if (params?.assignedToId) {
    conditions.push(eq(appointments.assignedToId, params.assignedToId));
  }

  if (params?.startDate) {
    conditions.push(gte(appointments.startTime, new Date(params.startDate)));
  }

  if (params?.endDate) {
    conditions.push(lte(appointments.startTime, new Date(params.endDate)));
  }

  const whereClause = and(...conditions.filter(Boolean));

  const rows = await db
    .select({
      status: appointments.status,
      count: count(),
    })
    .from(appointments)
    .leftJoin(leads, eq(appointments.leadId, leads.id))
    .leftJoin(customers, eq(appointments.customerId, customers.id))
    .where(whereClause)
    .groupBy(appointments.status);

  const metrics: AppointmentMetrics = {
    total: 0,
    scheduled: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    rescheduled: 0,
    cancelled: 0,
    noShow: 0,
  };

  for (const row of rows) {
    const num = row.count;
    metrics.total += num;
    switch (row.status) {
      case "scheduled":
        metrics.scheduled = num;
        break;
      case "confirmed":
        metrics.confirmed = num;
        break;
      case "in_progress":
        metrics.inProgress = num;
        break;
      case "completed":
        metrics.completed = num;
        break;
      case "rescheduled":
        metrics.rescheduled = num;
        break;
      case "cancelled":
        metrics.cancelled = num;
        break;
      case "no_show":
        metrics.noShow = num;
        break;
    }
  }

  return metrics;
}

export async function getFieldSalesUsers(): Promise<FieldSalesUser[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      roleCode: roles.code,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.status, "active"));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    roleCode: r.roleCode,
  }));
}

export async function findAppointmentWithFieldVisit(id: string): Promise<AppointmentWithVisit | null> {
  const appointment = await findAppointmentById(id);
  if (!appointment) return null;

  const fieldVisit = await findFieldVisitByAppointmentId(id);

  return {
    ...appointment,
    fieldVisit,
  };
}

