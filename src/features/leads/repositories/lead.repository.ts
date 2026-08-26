import { db } from "@/db";
import { eq, and, or, like, sql, desc, asc, count } from "drizzle-orm";
import {
  leads,
  leadStages,
  leadStageHistory,
  leadPartners,
  leadActivities,
  users,
} from "@/db/schema";
import type {
  LeadItem,
  LeadDetail,
  LeadStageItem,
  LeadQueryInput,
  CreateLeadInput,
  UpdateLeadInput,
  CreateLeadStageInput,
  LeadPriority,
  LeadStatus,
  PipelineBoardData,
  PipelineStageColumn,
  MoveLeadStageInput,
  ReorderStageLeadsInput,
  LeadActivityType,
  LeadActivityItem,
} from "../types/lead.types";

/**
 * Lead Repository
 * Handles all database operations for Leads, Stages, and Stage History using Drizzle ORM.
 */

export const findLeads = async (
  visibilityFilter: any,
  params: LeadQueryInput
): Promise<{ items: LeadItem[]; total: number }> => {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  // Build WHERE conditions array
  const conditions: any[] = [];

  if (visibilityFilter) {
    conditions.push(visibilityFilter);
  }

  if (params.status) {
    conditions.push(eq(leads.status, params.status as LeadStatus));
  }

  if (params.stageId) {
    conditions.push(eq(leads.stageId, params.stageId));
  }

  if (params.priority) {
    conditions.push(eq(leads.priority, params.priority as LeadPriority));
  }

  if (params.source) {
    conditions.push(eq(leads.source, params.source));
  }

  if (params.ownerId) {
    conditions.push(eq(leads.ownerId, params.ownerId));
  }

  if (params.search && params.search.trim() !== "") {
    const searchPattern = `%${params.search.trim()}%`;
    conditions.push(
      or(
        like(leads.name, searchPattern),
        like(leads.company, searchPattern),
        like(leads.phone, searchPattern),
        like(leads.email, searchPattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total matching records
  const totalResult = await db
    .select({ total: count() })
    .from(leads)
    .where(whereClause);

  const total = totalResult[0]?.total ?? 0;

  // Order by
  const sortColumn =
    params.sortBy === "name"
      ? leads.name
      : params.sortBy === "company"
      ? leads.company
      : params.sortBy === "priority"
      ? leads.priority
      : params.sortBy === "updatedAt"
      ? leads.updatedAt
      : leads.createdAt;

  const orderExpr = params.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

  // Fetch paginated leads with relations
  const rows = await db
    .select({
      lead: leads,
      stage: leadStages,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(leads)
    .leftJoin(leadStages, eq(leads.stageId, leadStages.id))
    .leftJoin(users, eq(leads.ownerId, users.id))
    .where(whereClause)
    .orderBy(orderExpr)
    .limit(limit)
    .offset(offset);

  // Also fetch createdBy details separately if needed or via map
  const items: LeadItem[] = rows.map((r) => ({
    ...r.lead,
    priority: r.lead.priority as LeadPriority,
    status: r.lead.status as LeadStatus,
    stage: r.stage ? { ...r.stage } : null,
    owner: r.owner && r.owner.id ? { ...r.owner } : null,
    createdBy: null,
  }));

  return { items, total };
};

export const findLeadById = async (id: string): Promise<LeadDetail | null> => {
  const leadRow = await db
    .select({
      lead: leads,
      stage: leadStages,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(leads)
    .leftJoin(leadStages, eq(leads.stageId, leadStages.id))
    .leftJoin(users, eq(leads.ownerId, users.id))
    .where(eq(leads.id, id))
    .get();

  if (!leadRow) return null;

  // Fetch creator info
  let createdByInfo = null;
  if (leadRow.lead.createdById) {
    const creator = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, leadRow.lead.createdById))
      .get();
    if (creator) createdByInfo = creator;
  }

  // Fetch stage history with relations
  const historyRows = await db
    .select({
      history: leadStageHistory,
      fromStage: {
        id: leadStages.id,
        name: leadStages.name,
        code: leadStages.code,
        color: leadStages.color,
        order: leadStages.order,
        description: leadStages.description,
        createdAt: leadStages.createdAt,
        updatedAt: leadStages.updatedAt,
      },
      changedBy: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(leadStageHistory)
    .leftJoin(leadStages, eq(leadStageHistory.fromStageId, leadStages.id))
    .leftJoin(users, eq(leadStageHistory.changedById, users.id))
    .where(eq(leadStageHistory.leadId, id))
    .orderBy(desc(leadStageHistory.createdAt));

  // Fetch toStage separately to avoid multiple joins on same table in simple select
  const stageMap = new Map<number, LeadStageItem>();
  const allStages = await findLeadStages();
  allStages.forEach((s) => stageMap.set(s.id, s));

  const stageHistory = historyRows.map((h) => ({
    ...h.history,
    fromStage: h.history.fromStageId ? stageMap.get(h.history.fromStageId) ?? null : null,
    toStage: stageMap.get(h.history.toStageId) ?? null,
    changedBy: h.changedBy && h.changedBy.id ? h.changedBy : null,
  }));

  // Fetch partners
  const partnerRows = await db
    .select({
      partnerRel: leadPartners,
      partnerUser: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(leadPartners)
    .leftJoin(users, eq(leadPartners.partnerId, users.id))
    .where(eq(leadPartners.leadId, id));

  const partners = partnerRows.map((p) => ({
    ...p.partnerRel,
    partner: p.partnerUser && p.partnerUser.id ? p.partnerUser : null,
  }));

  const activities = await findLeadActivitiesByLeadId(id);

  return {
    ...leadRow.lead,
    priority: leadRow.lead.priority as LeadPriority,
    status: leadRow.lead.status as LeadStatus,
    stage: leadRow.stage ? { ...leadRow.stage } : null,
    owner: leadRow.owner && leadRow.owner.id ? { ...leadRow.owner } : null,
    createdBy: createdByInfo,
    stageHistory,
    partners,
    activities,
  };
};

export const createLeadActivityRecord = async (
  leadId: string,
  createdById: string,
  type: LeadActivityType,
  content: string
): Promise<LeadActivityItem> => {
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(leadActivities).values({
    id,
    leadId,
    type,
    content,
    createdById,
    createdAt: now,
  });

  const user = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, createdById))
    .get();

  return {
    id,
    leadId,
    type,
    content,
    createdById,
    createdAt: now,
    createdBy: user ?? null,
  };
};

export const findLeadActivitiesByLeadId = async (leadId: string): Promise<LeadActivityItem[]> => {
  const rows = await db
    .select({
      activity: leadActivities,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(leadActivities)
    .leftJoin(users, eq(leadActivities.createdById, users.id))
    .where(eq(leadActivities.leadId, leadId))
    .orderBy(desc(leadActivities.createdAt));

  return rows.map((r) => ({
    ...r.activity,
    type: r.activity.type as LeadActivityType,
    createdBy: r.user && r.user.id ? r.user : null,
  }));
};

export const createLeadRecord = async (
  input: CreateLeadInput & { createdById: string; ownerId: string }
): Promise<LeadItem> => {
  const newLeadId = crypto.randomUUID();
  const now = new Date();

  await db.insert(leads).values({
    id: newLeadId,
    name: input.name,
    company: input.company ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    source: input.source ?? null,
    requirements: input.requirements ?? null,
    notes: input.notes ?? null,
    priority: input.priority,
    stageId: input.stageId,
    ownerId: input.ownerId,
    createdById: input.createdById,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  const created = await findLeadById(newLeadId);
  if (!created) {
    throw new Error("Failed to retrieve created lead record.");
  }

  return created;
};

export const updateLeadRecord = async (
  id: string,
  input: UpdateLeadInput
): Promise<LeadDetail> => {
  const now = new Date();

  await db
    .update(leads)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.company !== undefined && { company: input.company }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.requirements !== undefined && { requirements: input.requirements }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.stageId !== undefined && { stageId: input.stageId }),
      ...(input.ownerId !== undefined && { ownerId: input.ownerId }),
      ...(input.status !== undefined && { status: input.status }),
      updatedAt: now,
    })
    .where(eq(leads.id, id));

  const updated = await findLeadById(id);
  if (!updated) {
    throw new Error("Failed to retrieve updated lead record.");
  }

  return updated;
};

export const reassignLeadOwner = async (
  id: string,
  newOwnerId: string
): Promise<LeadDetail> => {
  const now = new Date();

  await db
    .update(leads)
    .set({
      ownerId: newOwnerId,
      updatedAt: now,
    })
    .where(eq(leads.id, id));

  const updated = await findLeadById(id);
  if (!updated) {
    throw new Error("Failed to retrieve reassigned lead record.");
  }

  return updated;
};

export const updateLeadStageWithHistory = async (
  id: string,
  fromStageId: number,
  toStageId: number,
  changedById: string,
  reason?: string | null
): Promise<LeadDetail> => {
  const now = new Date();
  const historyId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    // 1. Update lead's stageId
    await tx
      .update(leads)
      .set({
        stageId: toStageId,
        updatedAt: now,
      })
      .where(eq(leads.id, id));

    // 2. Insert history record
    await tx.insert(leadStageHistory).values({
      id: historyId,
      leadId: id,
      fromStageId,
      toStageId,
      changedById,
      reason: reason ?? null,
      createdAt: now,
    });
  });

  const updated = await findLeadById(id);
  if (!updated) {
    throw new Error("Failed to retrieve lead record after stage update.");
  }

  return updated;
};

export const findLeadStages = async (): Promise<LeadStageItem[]> => {
  return await db.select().from(leadStages).orderBy(asc(leadStages.order));
};

export const getLeadStageById = async (stageId: number): Promise<LeadStageItem | null> => {
  const stage = await db
    .select()
    .from(leadStages)
    .where(eq(leadStages.id, stageId))
    .get();

  return stage ?? null;
};

export const createLeadStageRecord = async (input: CreateLeadStageInput): Promise<LeadStageItem> => {
  const now = new Date();

  const inserted = await db
    .insert(leadStages)
    .values({
      name: input.name,
      code: input.code,
      color: input.color,
      order: input.order,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return inserted[0];
};

export const updateLeadStageOrders = async (
  stageOrders: Array<{ id: number; order: number }>
): Promise<LeadStageItem[]> => {
  const now = new Date();

  await db.transaction(async (tx) => {
    for (const item of stageOrders) {
      await tx
        .update(leadStages)
        .set({
          order: item.order,
          updatedAt: now,
        })
        .where(eq(leadStages.id, item.id));
    }
  });

  return await findLeadStages();
};

export const findPipelineBoardData = async (
  visibilityFilter: any,
  params: LeadQueryInput
): Promise<PipelineBoardData> => {
  const stages = await db.select().from(leadStages).orderBy(asc(leadStages.order));

  const conditions: any[] = [];

  if (visibilityFilter) {
    conditions.push(visibilityFilter);
  }

  conditions.push(eq(leads.status, (params.status as LeadStatus) || "active"));

  if (params.priority) {
    conditions.push(eq(leads.priority, params.priority as LeadPriority));
  }

  if (params.source) {
    conditions.push(eq(leads.source, params.source));
  }

  if (params.ownerId) {
    conditions.push(eq(leads.ownerId, params.ownerId));
  }

  if (params.search && params.search.trim() !== "") {
    const searchPattern = `%${params.search.trim()}%`;
    conditions.push(
      or(
        like(leads.name, searchPattern),
        like(leads.company, searchPattern),
        like(leads.phone, searchPattern),
        like(leads.email, searchPattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      lead: leads,
      stage: leadStages,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(leads)
    .leftJoin(leadStages, eq(leads.stageId, leadStages.id))
    .leftJoin(users, eq(leads.ownerId, users.id))
    .where(whereClause)
    .orderBy(asc(leads.stageId), asc(leads.position), desc(leads.createdAt));

  const leadItems: LeadItem[] = rows.map((r) => ({
    ...r.lead,
    priority: r.lead.priority as LeadPriority,
    status: r.lead.status as LeadStatus,
    stage: r.stage ? { ...r.stage } : null,
    owner: r.owner && r.owner.id ? { ...r.owner } : null,
    createdBy: null,
  }));

  const leadsByStageMap = new Map<number, LeadItem[]>();
  for (const item of leadItems) {
    const stageLeads = leadsByStageMap.get(item.stageId) || [];
    stageLeads.push(item);
    leadsByStageMap.set(item.stageId, stageLeads);
  }

  const stageColumns: PipelineStageColumn[] = stages.map((s) => {
    const stageLeads = leadsByStageMap.get(s.id) || [];
    return {
      ...s,
      leads: stageLeads,
      totalCount: stageLeads.length,
    };
  });

  return {
    stages: stageColumns,
    totalLeads: leadItems.length,
  };
};

export const updateLeadStageAndPositionInRepo = async (
  id: string,
  fromStageId: number,
  toStageId: number,
  newPosition: number,
  changedById: string,
  reason?: string | null
): Promise<LeadDetail> => {
  const now = new Date();
  const historyId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx
      .update(leads)
      .set({
        stageId: toStageId,
        position: newPosition,
        updatedAt: now,
      })
      .where(eq(leads.id, id));

    if (fromStageId !== toStageId) {
      await tx.insert(leadStageHistory).values({
        id: historyId,
        leadId: id,
        fromStageId,
        toStageId,
        changedById,
        reason: reason ?? null,
        createdAt: now,
      });
    }

    const targetStageLeads = await tx
      .select({ id: leads.id, position: leads.position })
      .from(leads)
      .where(and(eq(leads.stageId, toStageId), eq(leads.status, "active")))
      .orderBy(asc(leads.position), desc(leads.createdAt));

    let pos = 0;
    for (const lead of targetStageLeads) {
      if (lead.position !== pos) {
        await tx
          .update(leads)
          .set({ position: pos, updatedAt: now })
          .where(eq(leads.id, lead.id));
      }
      pos++;
    }

    if (fromStageId !== toStageId) {
      const sourceStageLeads = await tx
        .select({ id: leads.id, position: leads.position })
        .from(leads)
        .where(and(eq(leads.stageId, fromStageId), eq(leads.status, "active")))
        .orderBy(asc(leads.position), desc(leads.createdAt));

      let srcPos = 0;
      for (const lead of sourceStageLeads) {
        if (lead.position !== srcPos) {
          await tx
            .update(leads)
            .set({ position: srcPos, updatedAt: now })
            .where(eq(leads.id, lead.id));
        }
        srcPos++;
      }
    }
  });

  const updated = await findLeadById(id);
  if (!updated) {
    throw new Error("Failed to retrieve lead record after stage & position update.");
  }

  return updated;
};

export const updateLeadPositionsInStage = async (
  stageId: number,
  leadOrders: Array<{ leadId: string; position: number }>
): Promise<void> => {
  const now = new Date();

  await db.transaction(async (tx) => {
    for (const item of leadOrders) {
      await tx
        .update(leads)
        .set({
          position: item.position,
          updatedAt: now,
        })
        .where(and(eq(leads.id, item.leadId), eq(leads.stageId, stageId)));
    }
  });
};

