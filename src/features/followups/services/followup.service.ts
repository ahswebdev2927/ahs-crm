import { AppError } from "@/lib/errors/AppError";
import { logSystemEvent } from "@/features/activities/services/activity.service";
import {
  checkPermission,
  getLeadVisibilityFilter,
} from "@/features/auth/services/authorization.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import {
  findFollowUps,
  findFollowUpById,
  createFollowUpRecord,
  updateFollowUpRecord,
  completeFollowUpWithNextTransaction,
  getFollowUpMetrics,
} from "../repositories/followup.repository";
import { createLeadActivityRecord } from "@/features/leads/repositories/lead.repository";
import {
  createFollowUpSchema,
  updateFollowUpSchema,
  completeFollowUpSchema,
  cancelFollowUpSchema,
  followUpQuerySchema,
} from "../schemas/followup.schema";
import type {
  CreateFollowUpInput,
  UpdateFollowUpInput,
  CompleteFollowUpInput,
  CancelFollowUpInput,
  FollowUpQueryInput,
} from "../schemas/followup.schema";
import type { FollowUpItem, FollowUpListResponse } from "../types/followup.types";

/**
 * Follow-up Business Logic Service
 * Enforces authentication, authorization, Zod validation, and activity logging.
 */

export const getFollowUps = async (
  user: AuthenticatedUserPayload,
  params: FollowUpQueryInput
): Promise<FollowUpListResponse> => {
  await checkPermission("leads:view");

  const validatedParams = followUpQuerySchema.parse(params);

  const visibilityFilter = getLeadVisibilityFilter(
    user.id,
    user.role.code,
    user.dataVisibility,
    user.teamId
  );

  const { items, total } = await findFollowUps(visibilityFilter, validatedParams);
  const metrics = await getFollowUpMetrics(visibilityFilter);

  const limit = validatedParams.limit ?? 10;
  const page = validatedParams.page ?? 1;
  const totalPages = Math.ceil(total / limit);

  return {
    items,
    metrics,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};

export const getFollowUpById = async (
  user: AuthenticatedUserPayload,
  id: string
): Promise<FollowUpItem> => {
  await checkPermission("leads:view");

  const followUp = await findFollowUpById(id);
  if (!followUp) {
    throw new AppError("Follow-up record not found", 404, "NOT_FOUND");
  }

  return followUp;
};

export const createFollowUp = async (
  user: AuthenticatedUserPayload,
  input: CreateFollowUpInput
): Promise<FollowUpItem> => {
  await checkPermission("leads:edit");

  const validatedInput = createFollowUpSchema.parse(input);

  const created = await createFollowUpRecord(validatedInput, user.id);

  // If associated with a lead, log activity event
  if (created.leadId) {
    const formattedDate = new Date(created.scheduledAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    await createLeadActivityRecord(
      created.leadId,
      user.id,
      "note",
      `Scheduled a follow-up (${created.type.toUpperCase()}) for ${formattedDate}.${
        created.notes ? ` Notes: ${created.notes}` : ""
      }`
    ).catch(() => {
      // Non-blocking log failure fallback
    });
  }

  return created;
};

export const updateFollowUp = async (
  user: AuthenticatedUserPayload,
  id: string,
  input: UpdateFollowUpInput
): Promise<FollowUpItem> => {
  await checkPermission("leads:edit");

  const existing = await findFollowUpById(id);
  if (!existing) {
    throw new AppError("Follow-up record not found", 404, "NOT_FOUND");
  }

  const validatedInput = updateFollowUpSchema.parse(input);
  const updated = await updateFollowUpRecord(id, validatedInput);

  if (updated.leadId && validatedInput.scheduledAt) {
    const formattedDate = new Date(updated.scheduledAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    await createLeadActivityRecord(
      updated.leadId,
      user.id,
      "note",
      `Rescheduled follow-up (${updated.type.toUpperCase()}) to ${formattedDate}.`
    ).catch(() => {});
  }

  return updated;
};

export const completeFollowUp = async (
  user: AuthenticatedUserPayload,
  id: string,
  input: CompleteFollowUpInput
): Promise<{ completed: FollowUpItem; nextFollowUp?: FollowUpItem }> => {
  await checkPermission("leads:edit");

  const existing = await findFollowUpById(id);
  if (!existing) {
    throw new AppError("Follow-up record not found", 404, "NOT_FOUND");
  }

  if (existing.status === "completed") {
    throw new AppError("Follow-up is already completed", 400, "BAD_REQUEST");
  }

  const validatedInput = completeFollowUpSchema.parse(input);

  const result = await completeFollowUpWithNextTransaction(
    id,
    validatedInput,
    user.id
  );

  if (result.completed.leadId) {
    let logMessage = `Completed follow-up (${result.completed.type.toUpperCase()}). Outcome: ${result.completed.outcome}`;
    if (result.nextFollowUp) {
      const nextDate = new Date(result.nextFollowUp.scheduledAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      logMessage += ` | Next follow-up scheduled for ${nextDate}.`;
    }

    await createLeadActivityRecord(
      result.completed.leadId,
      user.id,
      "note",
      logMessage
    ).catch(() => {});

    logSystemEvent({
      leadId: result.completed.leadId,
      userId: user.id,
      type: "follow_up",
      subject: `Completed Follow-up (${result.completed.type.toUpperCase()})`,
      description: `Follow-up completed with outcome: ${validatedInput.outcome}`,
      outcome: validatedInput.outcome,
      metadata: {
        followUpType: result.completed.type,
        channelOutcome: validatedInput.outcome,
      },
    }).catch(() => {});
  }

  return result;
};

export const cancelFollowUp = async (
  user: AuthenticatedUserPayload,
  id: string,
  input?: CancelFollowUpInput
): Promise<FollowUpItem> => {
  await checkPermission("leads:edit");

  const existing = await findFollowUpById(id);
  if (!existing) {
    throw new AppError("Follow-up record not found", 404, "NOT_FOUND");
  }

  const validatedInput = input ? cancelFollowUpSchema.parse(input) : {};

  const updated = await updateFollowUpRecord(id, {
    status: "cancelled",
    notes: validatedInput.reason
      ? `${existing.notes ? existing.notes + " | " : ""}Cancelled: ${validatedInput.reason}`
      : existing.notes,
  });

  if (updated.leadId) {
    await createLeadActivityRecord(
      updated.leadId,
      user.id,
      "note",
      `Cancelled follow-up (${updated.type.toUpperCase()}).${
        validatedInput.reason ? ` Reason: ${validatedInput.reason}` : ""
      }`
    ).catch(() => {});
  }

  return updated;
};
