import { AppError } from "@/lib/errors/AppError";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import {
  checkLeadAccess,
  checkCustomerAccess,
} from "@/features/auth/services/authorization.service";
import {
  findActivities,
  findActivityById,
  findCustomerOriginLeadId,
  createActivityRecord,
  updateActivityRecord,
  softDeleteActivityRecord,
  type ActivityWithUser,
} from "../repositories/activity.repository";
import {
  activityQuerySchema,
  createManualActivitySchema,
  updateManualActivitySchema,
  type ActivityQueryInput,
  type CreateManualActivityInput,
  type UpdateManualActivityInput,
} from "../schemas/activity.schema";
import type {
  ActivityItem,
  ActivityFeedResponse,
  ActivityType,
  ActivityMetadata,
} from "../types/activity.types";
import {
  getCategoryForType,
  parseActivityMetadata,
  formatActivityCurrency,
} from "../utils/activity-helpers";

export interface LogSystemEventInput {
  leadId?: string | null;
  customerId?: string | null;
  userId: string;
  type: ActivityType;
  subject: string;
  description?: string | null;
  outcome?: string | null;
  metadata?: ActivityMetadata | Record<string, unknown> | null;
  createdAt?: Date;
}

/**
 * Maps raw database activity record to rich client ActivityItem
 */
function mapToActivityItem(
  record: ActivityWithUser,
  actor: AuthenticatedUserPayload,
  isLeadPhase: boolean = false
): ActivityItem {
  const isSuperAdmin = actor.role.code === "super_admin";
  const isOwner = actor.id === record.userId;
  const isManual = record.category === "communication";

  return {
    id: record.id,
    leadId: record.leadId,
    customerId: record.customerId,
    userId: record.userId,
    category: record.category as "communication" | "lifecycle" | "commercial",
    type: record.type as ActivityType,
    subject: record.subject,
    description: record.description,
    outcome: record.outcome,
    metadata: parseActivityMetadata(record.metadata),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    user: record.user,
    isLeadPhase,
    canEdit: isManual && (isSuperAdmin || isOwner),
    canDelete: isManual && (isSuperAdmin || isOwner),
  };
}

/**
 * Retrieves the activity timeline for a lead or customer, applying RBAC visibility rules.
 * Automatically pulls continuous pre-conversion lead activities when viewing a customer timeline.
 */
export async function getTimeline(
  actor: AuthenticatedUserPayload,
  params: ActivityQueryInput
): Promise<ActivityFeedResponse> {
  const validatedQuery = activityQuerySchema.parse(params);

  if (!validatedQuery.leadId && !validatedQuery.customerId) {
    throw new AppError(
      "Either leadId or customerId is required to fetch an activity timeline.",
      400,
      "VALIDATION_ERROR"
    );
  }

  // 1. RBAC visibility checks
  let customerOriginLeadId: string | null = null;

  if (validatedQuery.leadId) {
    await checkLeadAccess(validatedQuery.leadId, "view", actor);
  }

  if (validatedQuery.customerId) {
    await checkCustomerAccess(validatedQuery.customerId, "view", actor);
    customerOriginLeadId = await findCustomerOriginLeadId(validatedQuery.customerId);
  }

  // 2. Query repository
  const { items, total, counts } = await findActivities(
    validatedQuery,
    customerOriginLeadId
  );

  const totalPages = Math.ceil(total / validatedQuery.limit) || 1;

  // 3. Transform items
  const mappedItems: ActivityItem[] = items.map((item) => {
    const isLeadPhase = Boolean(
      validatedQuery.customerId &&
        customerOriginLeadId &&
        item.leadId === customerOriginLeadId &&
        item.customerId !== validatedQuery.customerId
    );

    return mapToActivityItem(item, actor, isLeadPhase);
  });

  return {
    items: mappedItems,
    total,
    page: validatedQuery.page,
    limit: validatedQuery.limit,
    totalPages,
    counts,
  };
}

/**
 * Logs a new manual communication activity (call, note, email, meeting, WhatsApp).
 */
export async function logManualActivity(
  actor: AuthenticatedUserPayload,
  input: CreateManualActivityInput
): Promise<ActivityItem> {
  const validated = createManualActivitySchema.parse(input);

  // 1. RBAC edit permission checks
  if (validated.leadId) {
    await checkLeadAccess(validated.leadId, "edit", actor);
  }

  if (validated.customerId) {
    await checkCustomerAccess(validated.customerId, "edit", actor);
  }

  const now = new Date();
  const newActivityId = crypto.randomUUID();

  // 2. Persist record
  const created = await createActivityRecord({
    id: newActivityId,
    leadId: validated.leadId || null,
    customerId: validated.customerId || null,
    userId: actor.id,
    category: "communication",
    type: validated.type,
    subject: validated.subject,
    description: validated.description,
    outcome: validated.outcome || null,
    metadata: validated.metadata ? JSON.stringify(validated.metadata) : null,
    createdAt: now,
    updatedAt: now,
  });

  return mapToActivityItem(
    {
      ...created,
      user: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
      },
    },
    actor
  );
}

/**
 * Edits a manual communication activity.
 * Only the activity's author or a SuperAdmin can perform edits.
 * System lifecycle and commercial events are strictly immutable.
 */
export async function editManualActivity(
  actor: AuthenticatedUserPayload,
  id: string,
  input: UpdateManualActivityInput
): Promise<ActivityItem> {
  const validated = updateManualActivitySchema.parse(input);

  const existing = await findActivityById(id);
  if (!existing || existing.deletedAt) {
    throw new AppError("Activity not found or has been deleted.", 404, "NOT_FOUND");
  }

  // Immutability check
  if (existing.category !== "communication") {
    throw new AppError(
      "System lifecycle and commercial events are immutable and cannot be edited.",
      400,
      "IMMUTABLE_EVENT"
    );
  }

  // Ownership / SuperAdmin check
  const isSuperAdmin = actor.role.code === "super_admin";
  const isAuthor = actor.id === existing.userId;

  if (!isSuperAdmin && !isAuthor) {
    throw new AppError(
      "Access denied. You can only edit communication activities that you logged.",
      403,
      "FORBIDDEN"
    );
  }

  // Also check entity access
  if (existing.leadId) {
    await checkLeadAccess(existing.leadId, "edit", actor);
  }
  if (existing.customerId) {
    await checkCustomerAccess(existing.customerId, "edit", actor);
  }

  const updated = await updateActivityRecord(id, {
    subject: validated.subject ?? existing.subject,
    description: validated.description ?? existing.description,
    outcome: validated.outcome !== undefined ? validated.outcome : existing.outcome,
    metadata:
      validated.metadata !== undefined
        ? validated.metadata
          ? JSON.stringify(validated.metadata)
          : null
        : existing.metadata,
  });

  return mapToActivityItem(
    {
      ...updated,
      user: existing.user,
    },
    actor
  );
}

/**
 * Soft-deletes a manual communication activity.
 * Only the activity's author or a SuperAdmin can delete activities.
 * System lifecycle and commercial events are strictly immutable.
 */
export async function deleteManualActivity(
  actor: AuthenticatedUserPayload,
  id: string
): Promise<{ success: boolean; message: string }> {
  const existing = await findActivityById(id);
  if (!existing || existing.deletedAt) {
    throw new AppError("Activity not found or has already been deleted.", 404, "NOT_FOUND");
  }

  // Immutability check
  if (existing.category !== "communication") {
    throw new AppError(
      "System lifecycle and commercial events are immutable and cannot be deleted.",
      400,
      "IMMUTABLE_EVENT"
    );
  }

  // Ownership / SuperAdmin check
  const isSuperAdmin = actor.role.code === "super_admin";
  const isAuthor = actor.id === existing.userId;

  if (!isSuperAdmin && !isAuthor) {
    throw new AppError(
      "Access denied. You can only delete communication activities that you logged.",
      403,
      "FORBIDDEN"
    );
  }

  // Check parent entity access
  if (existing.leadId) {
    await checkLeadAccess(existing.leadId, "edit", actor);
  }
  if (existing.customerId) {
    await checkCustomerAccess(existing.customerId, "edit", actor);
  }

  await softDeleteActivityRecord(id);

  return {
    success: true,
    message: "Activity deleted successfully.",
  };
}

/**
 * Central system event logger for feature services (leads, quotations, payments, etc.).
 * Guarantees automated event recording with INR currency formatting and safe error boundaries.
 */
export async function logSystemEvent(eventData: LogSystemEventInput): Promise<void> {
  try {
    const category = getCategoryForType(eventData.type);
    const now = eventData.createdAt || new Date();

    const metadataObj: ActivityMetadata = {
      ...(eventData.metadata as ActivityMetadata),
    };

    // If amount in paise is provided, format it into Indian Rupees
    if (typeof metadataObj.amountPaise === "number") {
      metadataObj.formattedAmount = formatActivityCurrency(metadataObj.amountPaise);
    }

    await createActivityRecord({
      id: crypto.randomUUID(),
      leadId: eventData.leadId || null,
      customerId: eventData.customerId || null,
      userId: eventData.userId,
      category,
      type: eventData.type,
      subject: eventData.subject,
      description: eventData.description || null,
      outcome: eventData.outcome || null,
      metadata: Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    // Non-blocking error logging to protect main business transactions
    console.error(`[ActivityService] Failed to log system event (${eventData.type}):`, err);
  }
}
