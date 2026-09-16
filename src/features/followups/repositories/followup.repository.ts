import { db } from "@/db";
import { eq, and, or, like, sql, desc, asc, count, gte, lte, lt, gt } from "drizzle-orm";
import { followUps, leads, customers, users } from "@/db/schema";
import type {
  FollowUpItem,
  FollowUpMetrics,
  FollowUpListResponse,
} from "../types/followup.types";
import type {
  CreateFollowUpInput,
  UpdateFollowUpInput,
  CompleteFollowUpInput,
  FollowUpQueryInput,
  FollowUpStatus,
  FollowUpType,
} from "../schemas/followup.schema";

const selectFields = {
  id: followUps.id,
  leadId: followUps.leadId,
  customerId: followUps.customerId,
  scheduledAt: followUps.scheduledAt,
  type: followUps.type,
  notes: followUps.notes,
  outcome: followUps.outcome,
  status: followUps.status,
  completedAt: followUps.completedAt,
  createdById: followUps.createdById,
  assignedToId: followUps.assignedToId,
  createdAt: followUps.createdAt,
  updatedAt: followUps.updatedAt,
  lead: {
    id: leads.id,
    name: leads.name,
    company: leads.company,
    phone: leads.phone,
    email: leads.email,
  },
  customer: {
    id: customers.id,
    name: customers.name,
    company: customers.company,
    phone: customers.phone,
    email: customers.email,
  },
  assignedTo: {
    id: users.id,
    name: users.name,
    email: users.email,
  },
};

export const findFollowUps = async (
  visibilityFilter: any,
  params: FollowUpQueryInput
): Promise<{ items: FollowUpItem[]; total: number }> => {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  const conditions: any[] = [];

  if (visibilityFilter) {
    conditions.push(visibilityFilter);
  }

  if (params.leadId) {
    conditions.push(eq(followUps.leadId, params.leadId));
  }

  if (params.customerId) {
    conditions.push(eq(followUps.customerId, params.customerId));
  }

  if (params.assignedToId) {
    conditions.push(eq(followUps.assignedToId, params.assignedToId));
  }

  if (params.status) {
    conditions.push(eq(followUps.status, params.status as FollowUpStatus));
  }

  if (params.type) {
    conditions.push(eq(followUps.type, params.type as FollowUpType));
  }

  // Timeframe filters
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (params.timeframe === "overdue") {
    conditions.push(
      and(
        lt(followUps.scheduledAt, startOfToday),
        eq(followUps.status, "scheduled")
      )
    );
  } else if (params.timeframe === "today") {
    conditions.push(
      and(
        gte(followUps.scheduledAt, startOfToday),
        lte(followUps.scheduledAt, endOfToday),
        eq(followUps.status, "scheduled")
      )
    );
  } else if (params.timeframe === "upcoming") {
    conditions.push(
      and(
        gt(followUps.scheduledAt, endOfToday),
        eq(followUps.status, "scheduled")
      )
    );
  } else if (params.timeframe === "completed") {
    conditions.push(eq(followUps.status, "completed"));
  }

  if (params.search && params.search.trim() !== "") {
    const searchPattern = `%${params.search.trim()}%`;
    conditions.push(
      or(
        like(followUps.notes, searchPattern),
        like(followUps.outcome, searchPattern),
        like(leads.name, searchPattern),
        like(leads.company, searchPattern),
        like(customers.name, searchPattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total matching records
  const totalResult = await db
    .select({ total: count() })
    .from(followUps)
    .leftJoin(leads, eq(followUps.leadId, leads.id))
    .leftJoin(customers, eq(followUps.customerId, customers.id))
    .where(whereClause);

  const total = totalResult[0]?.total ?? 0;

  // Order column
  const sortOrder = params.sortOrder === "desc" ? desc : asc;
  const sortColumn =
    params.sortBy === "createdAt"
      ? followUps.createdAt
      : params.sortBy === "status"
      ? followUps.status
      : followUps.scheduledAt;

  const rows = await db
    .select({
      id: followUps.id,
      leadId: followUps.leadId,
      customerId: followUps.customerId,
      scheduledAt: followUps.scheduledAt,
      type: followUps.type,
      notes: followUps.notes,
      outcome: followUps.outcome,
      status: followUps.status,
      completedAt: followUps.completedAt,
      createdById: followUps.createdById,
      assignedToId: followUps.assignedToId,
      createdAt: followUps.createdAt,
      updatedAt: followUps.updatedAt,
      leadIdVal: leads.id,
      leadName: leads.name,
      leadCompany: leads.company,
      leadPhone: leads.phone,
      leadEmail: leads.email,
      customerIdVal: customers.id,
      customerName: customers.name,
      customerCompany: customers.company,
      customerPhone: customers.phone,
      customerEmail: customers.email,
      assignedToIdVal: users.id,
      assignedToName: users.name,
      assignedToEmail: users.email,
    })
    .from(followUps)
    .leftJoin(leads, eq(followUps.leadId, leads.id))
    .leftJoin(customers, eq(followUps.customerId, customers.id))
    .leftJoin(users, eq(followUps.assignedToId, users.id))
    .where(whereClause)
    .orderBy(sortOrder(sortColumn))
    .limit(limit)
    .offset(offset);

  const items: FollowUpItem[] = rows.map((row) => ({
    id: row.id,
    leadId: row.leadId,
    customerId: row.customerId,
    scheduledAt: row.scheduledAt,
    type: row.type as FollowUpType,
    notes: row.notes,
    outcome: row.outcome,
    status: row.status as FollowUpStatus,
    completedAt: row.completedAt,
    createdById: row.createdById,
    assignedToId: row.assignedToId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lead: row.leadIdVal
      ? {
          id: row.leadIdVal,
          name: row.leadName!,
          company: row.leadCompany,
          phone: row.leadPhone,
          email: row.leadEmail,
        }
      : null,
    customer: row.customerIdVal
      ? {
          id: row.customerIdVal,
          name: row.customerName!,
          company: row.customerCompany,
          phone: row.customerPhone,
          email: row.customerEmail,
        }
      : null,
    assignedTo: row.assignedToIdVal
      ? {
          id: row.assignedToIdVal,
          name: row.assignedToName!,
          email: row.assignedToEmail!,
        }
      : null,
  }));

  return { items, total };
};

export const findFollowUpById = async (
  id: string
): Promise<FollowUpItem | null> => {
  const rows = await db
    .select({
      id: followUps.id,
      leadId: followUps.leadId,
      customerId: followUps.customerId,
      scheduledAt: followUps.scheduledAt,
      type: followUps.type,
      notes: followUps.notes,
      outcome: followUps.outcome,
      status: followUps.status,
      completedAt: followUps.completedAt,
      createdById: followUps.createdById,
      assignedToId: followUps.assignedToId,
      createdAt: followUps.createdAt,
      updatedAt: followUps.updatedAt,
      leadIdVal: leads.id,
      leadName: leads.name,
      leadCompany: leads.company,
      leadPhone: leads.phone,
      leadEmail: leads.email,
      customerIdVal: customers.id,
      customerName: customers.name,
      customerCompany: customers.company,
      customerPhone: customers.phone,
      customerEmail: customers.email,
      assignedToIdVal: users.id,
      assignedToName: users.name,
      assignedToEmail: users.email,
    })
    .from(followUps)
    .leftJoin(leads, eq(followUps.leadId, leads.id))
    .leftJoin(customers, eq(followUps.customerId, customers.id))
    .leftJoin(users, eq(followUps.assignedToId, users.id))
    .where(eq(followUps.id, id))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    leadId: row.leadId,
    customerId: row.customerId,
    scheduledAt: row.scheduledAt,
    type: row.type as FollowUpType,
    notes: row.notes,
    outcome: row.outcome,
    status: row.status as FollowUpStatus,
    completedAt: row.completedAt,
    createdById: row.createdById,
    assignedToId: row.assignedToId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lead: row.leadIdVal
      ? {
          id: row.leadIdVal,
          name: row.leadName!,
          company: row.leadCompany,
          phone: row.leadPhone,
          email: row.leadEmail,
        }
      : null,
    customer: row.customerIdVal
      ? {
          id: row.customerIdVal,
          name: row.customerName!,
          company: row.customerCompany,
          phone: row.customerPhone,
          email: row.customerEmail,
        }
      : null,
    assignedTo: row.assignedToIdVal
      ? {
          id: row.assignedToIdVal,
          name: row.assignedToName!,
          email: row.assignedToEmail!,
        }
      : null,
  };
};

export const createFollowUpRecord = async (
  data: CreateFollowUpInput,
  createdById: string
): Promise<FollowUpItem> => {
  const newId = crypto.randomUUID();
  const now = new Date();

  const sanitizedLeadId = data.leadId && data.leadId.trim() !== "" ? data.leadId : null;
  const sanitizedCustomerId = data.customerId && data.customerId.trim() !== "" ? data.customerId : null;
  const sanitizedAssignedToId =
    data.assignedToId && data.assignedToId.trim() !== "" && data.assignedToId !== "current"
      ? data.assignedToId
      : createdById;

  await db.insert(followUps).values({
    id: newId,
    leadId: sanitizedLeadId,
    customerId: sanitizedCustomerId,
    scheduledAt: data.scheduledAt,
    type: data.type,
    notes: data.notes || null,
    status: "scheduled",
    createdById,
    assignedToId: sanitizedAssignedToId,
    createdAt: now,
    updatedAt: now,
  });

  const created = await findFollowUpById(newId);
  if (!created) {
    throw new Error("Failed to retrieve created follow-up record");
  }
  return created;
};

export const updateFollowUpRecord = async (
  id: string,
  data: UpdateFollowUpInput
): Promise<FollowUpItem> => {
  const updatePayload: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (data.scheduledAt !== undefined) updatePayload.scheduledAt = data.scheduledAt;
  if (data.type !== undefined) updatePayload.type = data.type;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  if (data.assignedToId !== undefined) updatePayload.assignedToId = data.assignedToId;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.outcome !== undefined) updatePayload.outcome = data.outcome;

  await db.update(followUps).set(updatePayload).where(eq(followUps.id, id));

  const updated = await findFollowUpById(id);
  if (!updated) {
    throw new Error("Failed to retrieve updated follow-up record");
  }
  return updated;
};

export const completeFollowUpWithNextTransaction = async (
  id: string,
  input: CompleteFollowUpInput,
  createdById: string
): Promise<{ completed: FollowUpItem; nextFollowUp?: FollowUpItem }> => {
  const now = new Date();
  const current = await findFollowUpById(id);

  if (!current) {
    throw new Error("Follow-up record not found");
  }

  return await db.transaction(async (tx) => {
    // 1. Update current follow-up as completed
    await tx
      .update(followUps)
      .set({
        status: "completed",
        outcome: input.outcome,
        completedAt: input.completedAt || now,
        updatedAt: now,
      })
      .where(eq(followUps.id, id));

    // 2. Read updated completed record
    const updatedRows = await tx
      .select({
        id: followUps.id,
        leadId: followUps.leadId,
        customerId: followUps.customerId,
        scheduledAt: followUps.scheduledAt,
        type: followUps.type,
        notes: followUps.notes,
        outcome: followUps.outcome,
        status: followUps.status,
        completedAt: followUps.completedAt,
        createdById: followUps.createdById,
        assignedToId: followUps.assignedToId,
        createdAt: followUps.createdAt,
        updatedAt: followUps.updatedAt,
      })
      .from(followUps)
      .where(eq(followUps.id, id))
      .limit(1);

    const completedRow = updatedRows[0];
    const completedItem: FollowUpItem = {
      ...completedRow,
      type: completedRow.type as FollowUpType,
      status: completedRow.status as FollowUpStatus,
      lead: current.lead,
      customer: current.customer,
      assignedTo: current.assignedTo,
    };

    let nextItem: FollowUpItem | undefined = undefined;

    // 3. Optionally create next follow-up if requested
    if (input.nextFollowUp) {
      const nextId = crypto.randomUUID();
      const assignedToId =
        input.nextFollowUp.assignedToId &&
        input.nextFollowUp.assignedToId !== "current" &&
        input.nextFollowUp.assignedToId.trim() !== ""
          ? input.nextFollowUp.assignedToId
          : current.assignedToId;

      await tx.insert(followUps).values({
        id: nextId,
        leadId: current.leadId || null,
        customerId: current.customerId || null,
        scheduledAt: input.nextFollowUp.scheduledAt,
        type: input.nextFollowUp.type,
        notes: input.nextFollowUp.notes || null,
        status: "scheduled",
        createdById,
        assignedToId,
        createdAt: now,
        updatedAt: now,
      });

      const nextRows = await tx
        .select()
        .from(followUps)
        .where(eq(followUps.id, nextId))
        .limit(1);

      if (nextRows.length > 0) {
        nextItem = {
          ...nextRows[0],
          type: nextRows[0].type as FollowUpType,
          status: nextRows[0].status as FollowUpStatus,
          lead: current.lead,
          customer: current.customer,
          assignedTo: current.assignedTo,
        };
      }
    }

    return { completed: completedItem, nextFollowUp: nextItem };
  });
};

export const getFollowUpMetrics = async (
  visibilityFilter: any
): Promise<FollowUpMetrics> => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const baseConditions: any[] = [];
  if (visibilityFilter) {
    baseConditions.push(visibilityFilter);
  }

  // Overdue count
  const overdueConds = [...baseConditions, lt(followUps.scheduledAt, startOfToday), eq(followUps.status, "scheduled")];
  const overdueRes = await db.select({ total: count() }).from(followUps).where(and(...overdueConds));

  // Today count
  const todayConds = [...baseConditions, gte(followUps.scheduledAt, startOfToday), lte(followUps.scheduledAt, endOfToday), eq(followUps.status, "scheduled")];
  const todayRes = await db.select({ total: count() }).from(followUps).where(and(...todayConds));

  // Upcoming count
  const upcomingConds = [...baseConditions, gt(followUps.scheduledAt, endOfToday), eq(followUps.status, "scheduled")];
  const upcomingRes = await db.select({ total: count() }).from(followUps).where(and(...upcomingConds));

  // Completed Today count
  const completedTodayConds = [...baseConditions, gte(followUps.completedAt, startOfToday), lte(followUps.completedAt, endOfToday), eq(followUps.status, "completed")];
  const completedTodayRes = await db.select({ total: count() }).from(followUps).where(and(...completedTodayConds));

  // Total pending count
  const totalPendingConds = [...baseConditions, eq(followUps.status, "scheduled")];
  const totalPendingRes = await db.select({ total: count() }).from(followUps).where(and(...totalPendingConds));

  return {
    overdueCount: overdueRes[0]?.total ?? 0,
    todayCount: todayRes[0]?.total ?? 0,
    upcomingCount: upcomingRes[0]?.total ?? 0,
    completedTodayCount: completedTodayRes[0]?.total ?? 0,
    totalPendingCount: totalPendingRes[0]?.total ?? 0,
  };
};
