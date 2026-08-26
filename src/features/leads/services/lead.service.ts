import { AppError } from "@/lib/errors/AppError";
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
  return await createLeadRecord({
    ...validated,
    createdById: user.id,
    ownerId,
  });
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

    return await updateLeadStageWithHistory(
      leadId,
      existing.stageId,
      validated.stageId,
      user.id,
      "Lead stage updated via lead edit form"
    );
  }

  // 5. Execute normal lead properties update
  return await updateLeadRecord(leadId, validated);
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
  return await repoReassignLeadOwner(leadId, validated.ownerId);
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
  return await updateLeadStageWithHistory(
    leadId,
    existing.stageId,
    validated.toStageId,
    user.id,
    validated.reason ?? null
  );
};

export const getLeadStages = async (
  user: AuthenticatedUserPayload
): Promise<LeadStageItem[]> => {
  await checkPermission("leads:view");
  return await findLeadStages();
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
  return await createLeadStageRecord(validated);
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
  return await repoUpdateLeadStageOrders(validated);
};

export const getPipelineBoard = async (
  user: AuthenticatedUserPayload,
  params: LeadQueryInput
): Promise<PipelineBoardData> => {
  await checkPermission("leads:view");

  const validatedParams = leadQuerySchema.parse(params);

  const visibilityFilter = getLeadVisibilityFilter(
    user.id,
    user.role.code,
    user.dataVisibility,
    user.teamId
  );

  return await findPipelineBoardData(visibilityFilter, validatedParams);
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

  return await updateLeadStageAndPositionInRepo(
    validated.leadId,
    validated.fromStageId,
    validated.toStageId,
    validated.newPosition,
    user.id,
    validated.reason ?? "Moved via Sales Pipeline Kanban"
  );
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

