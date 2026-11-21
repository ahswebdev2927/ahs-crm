import { AppError } from "@/lib/errors/AppError";
import { CacheService, CACHE_TAGS } from "@/lib/cache/cache.service";
import { logSystemEvent } from "@/features/activities/services/activity.service";
import { recordAuditLog } from "@/features/audit/services/audit.service";
import { sendNotification } from "@/features/notifications/services/notification.service";
import { logBusinessMutation } from "@/lib/logger";
import {
  checkPermission,
  checkLeadAccess,
  getLeadVisibilityFilter,
} from "@/features/auth/services/authorization.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import {
  findLeads,
  findLeadById,
  createLeadRecord,
  updateLeadRecord,
  reassignLeadOwner as repoReassignLeadOwner,
  updateLeadStageWithHistory,
  findLeadStages,
  getLeadStageById,
  createLeadStageRecord,
  updateLeadStageOrders as repoUpdateLeadStageOrders,
  findPipelineBoardData,
  findStageLeads,
  updateLeadStageAndPositionInRepo,
  updateLeadPositionsInStage,
  createLeadActivityRecord,
} from "../repositories/lead.repository";
import {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  updateLeadStageSchema,
  createLeadStageSchema,
  reorderLeadStagesSchema,
  leadQuerySchema,
  moveLeadStageSchema,
  reorderStageLeadsSchema,
  createLeadActivitySchema,
} from "../schemas/lead.schema";
import type {
  LeadListResponse,
  LeadDetail,
  LeadItem,
  LeadStageItem,
  CreateLeadInput,
  UpdateLeadInput,
  AssignLeadInput,
  UpdateLeadStageInput,
  CreateLeadStageInput,
  ReorderLeadStagesInput,
  LeadQueryInput,
  PipelineBoardData,
  MoveLeadStageInput,
  ReorderStageLeadsInput,
  LeadActivityItem,
  CreateLeadActivityInput,
} from "../types/lead.types";

/**
 * Lead Business Logic Service
 * Enforces server-side authentication, authorization, Zod validation, and stage governance.
 */

export const invalidateLeadCaches = (
  user: AuthenticatedUserPayload,
  ownerId?: string | null
): void => {
  const tags: string[] = [
    CACHE_TAGS.DASHBOARD_BUSINESS,
    CACHE_TAGS.DASHBOARD_USER(user.id),
    CACHE_TAGS.PIPELINE_BOARD(user.id),
  ];
  if (user.teamId) {
    tags.push(CACHE_TAGS.DASHBOARD_TEAM(user.teamId));
  }
  if (ownerId && ownerId !== user.id) {
    tags.push(CACHE_TAGS.DASHBOARD_USER(ownerId));
    tags.push(CACHE_TAGS.PIPELINE_BOARD(ownerId));
  }
  CacheService.invalidateTags(tags);
};

export const getLeads = async (
  user: AuthenticatedUserPayload,
  params: LeadQueryInput
): Promise<LeadListResponse> => {
  // 1. Authorization check
  await checkPermission("leads:view");

  // 2. Validate input parameters
  const validatedParams = leadQuerySchema.parse(params);

  // 3. Obtain data visibility filter based on user role and team
  const visibilityFilter = getLeadVisibilityFilter(
    user.id,
    user.role.code,
    user.dataVisibility,
    user.teamId
  );

  // 4. Query repository
  const { items, total } = await findLeads(visibilityFilter, validatedParams);

  const limit = validatedParams.limit ?? 10;
  const page = validatedParams.page ?? 1;
  const totalPages = Math.ceil(total / limit);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};

export const getLeadById = async (
  user: AuthenticatedUserPayload,
  leadId: string
): Promise<LeadDetail> => {
  // 1. Authorization & visibility check
  await checkLeadAccess(leadId, "view");

  // 2. Query repository
  const lead = await findLeadById(leadId);

  if (!lead) {
    throw new AppError("Lead not found.", 404, "NOT_FOUND");
  }

  return lead;
};

export const createLead = async (
  user: AuthenticatedUserPayload,
  input: CreateLeadInput
): Promise<LeadItem> => {
  // 1. Authorization check
  await checkPermission("leads:create");

  // 2. Validate Zod input
  const validated = createLeadSchema.parse(input);

  // 3. Verify stage exists
  const stage = await getLeadStageById(validated.stageId);
  if (!stage) {
    throw new AppError(`Selected lead stage (ID: ${validated.stageId}) does not exist.`, 400, "VALIDATION_ERROR");
  }

  // 4. Business Rule: Default owner is lead creator if ownerId is not provided
  const ownerId = validated.ownerId && validated.ownerId.trim() !== "" ? validated.ownerId : user.id;

  // 5. Execute repository insert
  const createdLead = await createLeadRecord({
    ...validated,
    createdById: user.id,
    ownerId,
  });

  // 6. Log system lifecycle activity
  logSystemEvent({
    leadId: createdLead.id,
    userId: user.id,
    type: "lead_created",
    subject: `Lead created: ${createdLead.name}`,
    description: `Created lead in stage "${stage.name}"`,
    metadata: {
      toStageName: stage.name,
      toStageColor: stage.color,
    },
  }).catch(() => {});

  // 7. Record immutable audit log
  recordAuditLog({
    userId: user.id,
    action: "lead:created",
    entityType: "lead",
    entityId: createdLead.id,
    newData: {
      name: createdLead.name,
      company: createdLead.company,
      email: createdLead.email,
      phone: createdLead.phone,
      source: createdLead.source,
      priority: createdLead.priority,
      stageId: createdLead.stageId,
      stageName: stage.name,
      ownerId,
    },
  }).catch(() => {});

  // 8. Structured operational logging
  logBusinessMutation({
    action: "lead:created",
    entity: "leads",
    entityId: createdLead.id,
    actorId: user.id,
    metadata: {
      name: createdLead.name,
      company: createdLead.company,
      stageId: createdLead.stageId,
      stageName: stage.name,
      ownerId,
    },
  });

  // 9. Instantly invalidate affected lead & dashboard caches
  invalidateLeadCaches(user, ownerId);

  return createdLead;
};

export const updateLead = async (
  user: AuthenticatedUserPayload,
  leadId: string,
  input: UpdateLeadInput
): Promise<LeadDetail> => {
  // 1. Authorization & visibility check
  await checkLeadAccess(leadId, "edit");

  // 2. Validate Zod input
  const validated = updateLeadSchema.parse(input);

  // 3. Check existing lead
  const existing = await findLeadById(leadId);
  if (!existing) {
    throw new AppError("Lead not found.", 404, "NOT_FOUND");
  }

  // 4. If stage is changed, handle stage transition atomically with history
  if (validated.stageId && validated.stageId !== existing.stageId) {
    const targetStage = await getLeadStageById(validated.stageId);
    if (!targetStage) {
      throw new AppError(`Target stage (ID: ${validated.stageId}) does not exist.`, 400, "VALIDATION_ERROR");
    }

    const updated = await updateLeadStageWithHistory(
      leadId,
      existing.stageId,
      validated.stageId,
      user.id,
      "Lead stage updated via lead edit form"
    );

    logSystemEvent({
      leadId,
      userId: user.id,
      type: "stage_change",
      subject: `Stage changed to ${targetStage.name}`,
      description: `Stage updated from ${existing.stage?.name ?? "previous stage"} to ${targetStage.name}`,
      metadata: {
        fromStageName: existing.stage?.name,
        toStageName: targetStage.name,
        toStageColor: targetStage.color,
      },
    }).catch(() => {});

    recordAuditLog({
      userId: user.id,
      action: "lead:stage_changed",
      entityType: "lead",
      entityId: leadId,
      oldData: { stageId: existing.stageId, stageName: existing.stage?.name },
      newData: { stageId: validated.stageId, stageName: targetStage.name, reason: "Lead stage updated via lead edit form" },
    }).catch(() => {});

    logBusinessMutation({
      action: "lead:stage_changed",
      entity: "leads",
      entityId: leadId,
      actorId: user.id,
      metadata: {
        fromStageId: existing.stageId,
        fromStageName: existing.stage?.name,
        toStageId: validated.stageId,
        toStageName: targetStage.name,
      },
    });

    return updated;
  }

  // 5. Execute normal lead properties update
  const updatedLead = await updateLeadRecord(leadId, validated);

  recordAuditLog({
    userId: user.id,
    action: "lead:updated",
    entityType: "lead",
    entityId: leadId,
    oldData: {
      name: existing.name,
      company: existing.company,
      email: existing.email,
      phone: existing.phone,
      source: existing.source,
      priority: existing.priority,
      status: existing.status,
    },
    newData: validated,
  }).catch(() => {});

  logBusinessMutation({
    action: "lead:updated",
    entity: "leads",
    entityId: leadId,
    actorId: user.id,
    metadata: {
      updatedFields: Object.keys(validated),
    },
  });

  // Instantly invalidate affected lead & dashboard caches
  invalidateLeadCaches(user, existing.ownerId);
  if (updatedLead.ownerId && updatedLead.ownerId !== existing.ownerId) {
    invalidateLeadCaches(user, updatedLead.ownerId);
  }

  return updatedLead;
};

export const assignLead = async (
  user: AuthenticatedUserPayload,
  leadId: string,
  input: AssignLeadInput
): Promise<LeadDetail> => {
  // 1. Authorization check (only authorized users with assign/edit permission)
  await checkLeadAccess(leadId, "assign");

  // 2. Validate Zod input
  const validated = assignLeadSchema.parse(input);

  // 3. Verify lead exists
  const existing = await findLeadById(leadId);
  if (!existing) {
    throw new AppError("Lead not found.", 404, "NOT_FOUND");
  }

  // 4. Reassign lead owner
  const updated = await repoReassignLeadOwner(leadId, validated.ownerId);

  // 5. Record immutable audit log
  recordAuditLog({
    userId: user.id,
    action: existing.ownerId ? "lead:transferred" : "lead:assigned",
    entityType: "lead",
    entityId: leadId,
    oldData: { ownerId: existing.ownerId, ownerName: existing.owner?.name },
    newData: { ownerId: validated.ownerId, leadName: existing.name },
  }).catch(() => {});

  // 6. Structured operational logging
  logBusinessMutation({
    action: existing.ownerId ? "lead:transferred" : "lead:assigned",
    entity: "leads",
    entityId: leadId,
    actorId: user.id,
    metadata: {
      previousOwnerId: existing.ownerId,
      newOwnerId: validated.ownerId,
      leadName: existing.name,
    },
  });

  // 7. Dispatch notification to newly assigned owner (fail-safe)
  sendNotification({
    recipientId: validated.ownerId,
    title: "Lead Assigned",
    message: `You have been assigned as the owner of lead "${existing.name}".`,
    category: "leads",
    type: "lead:assigned",
    actionUrl: `/leads/${leadId}`,
    referenceId: leadId,
  }).catch(() => {});

  // Instantly invalidate affected lead & dashboard caches
  invalidateLeadCaches(user, existing.ownerId);
  invalidateLeadCaches(user, validated.ownerId);

  return updated;
};

export const changeLeadStage = async (
  user: AuthenticatedUserPayload,
  leadId: string,
  input: UpdateLeadStageInput
): Promise<LeadDetail> => {
  // 1. Authorization check
  await checkLeadAccess(leadId, "edit");

  // 2. Validate Zod input
  const validated = updateLeadStageSchema.parse(input);

  // 3. Fetch lead
  const existing = await findLeadById(leadId);
  if (!existing) {
    throw new AppError("Lead not found.", 404, "NOT_FOUND");
  }

  // 4. Verify destination stage exists
  const targetStage = await getLeadStageById(validated.toStageId);
  if (!targetStage) {
    throw new AppError(`Target lead stage (ID: ${validated.toStageId}) does not exist.`, 400, "VALIDATION_ERROR");
  }

  // 5. If already in target stage, return existing
  if (existing.stageId === validated.toStageId) {
    return existing;
  }

  // 6. Update stage and insert history record in atomic transaction
  const updated = await updateLeadStageWithHistory(
    leadId,
    existing.stageId,
    validated.toStageId,
    user.id,
    validated.reason ?? null
  );

  logSystemEvent({
    leadId,
    userId: user.id,
    type: "stage_change",
    subject: `Stage changed to ${targetStage.name}`,
    description: validated.reason || `Stage updated from ${existing.stage?.name ?? "previous stage"} to ${targetStage.name}`,
    metadata: {
      fromStageName: existing.stage?.name,
      toStageName: targetStage.name,
      toStageColor: targetStage.color,
      stageReason: validated.reason,
    },
  }).catch(() => {});

  recordAuditLog({
    userId: user.id,
    action: "lead:stage_changed",
    entityType: "lead",
    entityId: leadId,
    oldData: { stageId: existing.stageId, stageName: existing.stage?.name },
    newData: { stageId: targetStage.id, stageName: targetStage.name, reason: validated.reason ?? null },
  }).catch(() => {});

  // Instantly invalidate affected lead & dashboard caches
  invalidateLeadCaches(user, existing.ownerId);

  return updated;
};

export const getLeadStages = async (
  user: AuthenticatedUserPayload
): Promise<LeadStageItem[]> => {
  await checkPermission("leads:view");
  return await CacheService.wrap(
    "lead:stages:all",
    { tags: [CACHE_TAGS.LEAD_STAGES] },
    async () => await findLeadStages()
  );
};

export const createLeadStage = async (
  user: AuthenticatedUserPayload,
  input: CreateLeadStageInput
): Promise<LeadStageItem> => {
  // Centralized Governance: Managed only by Admin or Sales Manager
  if (user.role.code !== "super_admin" && user.role.code !== "sales_manager") {
    throw new AppError("Access denied. Lead stages can only be managed by Admins and Sales Managers.", 403, "FORBIDDEN");
  }

  const validated = createLeadStageSchema.parse(input);
  const created = await createLeadStageRecord(validated);
  CacheService.invalidateTags(CACHE_TAGS.LEAD_STAGES);
  return created;
};

export const reorderLeadStages = async (
  user: AuthenticatedUserPayload,
  input: ReorderLeadStagesInput
): Promise<LeadStageItem[]> => {
  // Centralized Governance: Managed only by Admin or Sales Manager
  if (user.role.code !== "super_admin" && user.role.code !== "sales_manager") {
    throw new AppError("Access denied. Lead stage ordering can only be managed by Admins and Sales Managers.", 403, "FORBIDDEN");
  }

  const validated = reorderLeadStagesSchema.parse(input);
  const updated = await repoUpdateLeadStageOrders(validated);
  CacheService.invalidateTags(CACHE_TAGS.LEAD_STAGES);
  return updated;
};

export const getPipelineBoard = async (
  user: AuthenticatedUserPayload,
  params: LeadQueryInput
): Promise<PipelineBoardData> => {
  await checkPermission("leads:view");

  const validatedParams = leadQuerySchema.parse(params);

  // In Sales Pipeline Kanban board, strictly show only own, created, or partnered leads for the logged-in user
  const visibilityFilter = getLeadVisibilityFilter(
    user.id,
    user.role.code,
    "own",
    user.teamId
  );

  return await findPipelineBoardData(visibilityFilter, validatedParams);
};

export const getStageLeads = async (
  user: AuthenticatedUserPayload,
  stageId: number,
  params: LeadQueryInput,
  offset: number = 0,
  limit: number = 25
): Promise<{ leads: LeadItem[]; totalCount: number; hasMore: boolean }> => {
  await checkPermission("leads:view");
  const validatedParams = leadQuerySchema.parse(params);

  const visibilityFilter = getLeadVisibilityFilter(
    user.id,
    user.role.code,
    "own",
    user.teamId
  );

  return await findStageLeads(stageId, visibilityFilter, validatedParams, offset, limit);
};

export const moveLeadStage = async (
  user: AuthenticatedUserPayload,
  input: MoveLeadStageInput
): Promise<LeadDetail> => {
  const validated = moveLeadStageSchema.parse(input);

  await checkLeadAccess(validated.leadId, "edit");

  const existing = await findLeadById(validated.leadId);
  if (!existing) {
    throw new AppError("Lead not found.", 404, "NOT_FOUND");
  }

  const targetStage = await getLeadStageById(validated.toStageId);
  if (!targetStage) {
    throw new AppError(`Destination stage (ID: ${validated.toStageId}) does not exist.`, 400, "VALIDATION_ERROR");
  }

  const updated = await updateLeadStageAndPositionInRepo(
    validated.leadId,
    validated.fromStageId,
    validated.toStageId,
    validated.newPosition,
    user.id,
    validated.reason ?? "Moved via Sales Pipeline Kanban"
  );

  logSystemEvent({
    leadId: validated.leadId,
    userId: user.id,
    type: "stage_change",
    subject: `Stage changed to ${targetStage.name}`,
    description: validated.reason ?? `Moved from ${existing.stage?.name ?? "previous stage"} to ${targetStage.name} via Kanban`,
    metadata: {
      fromStageName: existing.stage?.name,
      toStageName: targetStage.name,
      toStageColor: targetStage.color,
      stageReason: validated.reason,
    },
  }).catch(() => {});

  recordAuditLog({
    userId: user.id,
    action: "lead:stage_changed",
    entityType: "lead",
    entityId: validated.leadId,
    oldData: { stageId: existing.stageId, stageName: existing.stage?.name },
    newData: { stageId: targetStage.id, stageName: targetStage.name, reason: validated.reason ?? "Moved via Sales Pipeline Kanban" },
  }).catch(() => {});

  logBusinessMutation({
    action: "lead:stage_changed",
    entity: "leads",
    entityId: validated.leadId,
    actorId: user.id,
    metadata: {
      fromStageId: validated.fromStageId,
      fromStageName: existing.stage?.name,
      toStageId: validated.toStageId,
      toStageName: targetStage.name,
      newPosition: validated.newPosition,
      reason: validated.reason ?? "Moved via Sales Pipeline Kanban",
    },
  });

  // Instantly invalidate affected lead & dashboard caches
  invalidateLeadCaches(user, existing.ownerId);

  return updated;
};

export const reorderStageLeads = async (
  user: AuthenticatedUserPayload,
  input: ReorderStageLeadsInput
): Promise<void> => {
  await checkPermission("leads:edit");

  const validated = reorderStageLeadsSchema.parse(input);

  const stage = await getLeadStageById(validated.stageId);
  if (!stage) {
    throw new AppError(`Stage (ID: ${validated.stageId}) does not exist.`, 400, "VALIDATION_ERROR");
  }

  await updateLeadPositionsInStage(validated.stageId, validated.leadOrders);

  // Instantly invalidate affected lead & dashboard caches
  invalidateLeadCaches(user, null);
};

export const addLeadActivity = async (
  user: AuthenticatedUserPayload,
  leadId: string,
  input: CreateLeadActivityInput
): Promise<LeadActivityItem> => {
  await checkLeadAccess(leadId, "view");
  const validated = createLeadActivitySchema.parse(input);
  return await createLeadActivityRecord(leadId, user.id, validated.type, validated.content);
};

