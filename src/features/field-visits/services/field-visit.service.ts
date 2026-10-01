import { AppError } from "@/lib/errors/AppError";
import { db } from "@/db";
import { notifications, leadActivities, followUps, appointments } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  checkPermission,
  getLeadVisibilityFilter,
  checkFieldVisitAccess,
} from "@/features/auth/services/authorization.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import {
  findFieldVisits,
  findFieldVisitById,
  createFieldVisitRecord,
  updateFieldVisitRecord,
  completeFieldVisitRecord as completeFieldVisitRecordRepo,
  getFieldVisitMetrics,
} from "../repositories/field-visit.repository";
import {
  createFieldVisitSchema,
  updateFieldVisitSchema,
  completeFieldVisitSchema,
  fieldVisitQuerySchema,
} from "../schemas/field-visit.schema";
import type {
  CreateFieldVisitInput,
  UpdateFieldVisitInput,
  CompleteFieldVisitInput,
  FieldVisitQueryInput,
} from "../schemas/field-visit.schema";
import type { FieldVisitItem, FieldVisitListResponse } from "../types/field-visit.types";

/**
 * Dispatch notification for field visit assignment or completion
 */
async function dispatchVisitNotification(
  recipientId: string,
  title: string,
  message: string,
  referenceId: string
) {
  try {
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      recipientId,
      title,
      message,
      type: "appointment_assigned",
      referenceId,
      isRead: 0,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to create field visit notification:", err);
  }
}

/**
 * Log activity in lead timeline
 */
async function logLeadActivity(
  leadId: string,
  userId: string,
  type: "meeting" | "note" | "call" | "email",
  content: string
) {
  try {
    await db.insert(leadActivities).values({
      id: crypto.randomUUID(),
      leadId,
      type,
      content,
      createdById: userId,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to log lead activity for field visit:", err);
  }
}

export const getFieldVisits = async (
  user: AuthenticatedUserPayload,
  params: FieldVisitQueryInput
): Promise<FieldVisitListResponse> => {
  await checkPermission("leads:view");

  const validatedParams = fieldVisitQuerySchema.parse(params);

  const visibilityFilter = getLeadVisibilityFilter(
    user.id,
    user.role.code,
    user.dataVisibility,
    user.teamId
  );

  const { items, total } = await findFieldVisits(visibilityFilter, validatedParams);
  const metrics = await getFieldVisitMetrics(visibilityFilter, validatedParams);

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

export const getFieldVisitById = async (
  user: AuthenticatedUserPayload,
  id: string
): Promise<FieldVisitItem> => {
  await checkPermission("leads:view");
  await checkFieldVisitAccess(id, "view");

  const visit = await findFieldVisitById(id);
  if (!visit) {
    throw new AppError("Field visit not found", 404, "NOT_FOUND");
  }

  return visit;
};

export const createFieldVisit = async (
  user: AuthenticatedUserPayload,
  input: CreateFieldVisitInput
): Promise<FieldVisitItem> => {
  await checkPermission("leads:edit");

  const validatedInput = createFieldVisitSchema.parse(input);

  const created = await createFieldVisitRecord(validatedInput, user.id);

  const formattedDate = new Date(created.visitDate).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Notify assigned representative if different from creator
  if (created.assignedToId && created.assignedToId !== user.id) {
    await dispatchVisitNotification(
      created.assignedToId,
      "New Field Visit Assigned",
      `You have been assigned a field visit for ${created.purpose} on ${formattedDate}.`,
      created.id
    );
  }

  // Log activity on lead timeline if associated
  if (created.leadId) {
    await logLeadActivity(
      created.leadId,
      user.id,
      "meeting",
      `Scheduled Field Visit: "${created.purpose}" on ${formattedDate} assigned to ${created.assignedTo?.name || "Field Agent"}.`
    );
  }

  return created;
};

export const updateFieldVisit = async (
  user: AuthenticatedUserPayload,
  id: string,
  input: UpdateFieldVisitInput
): Promise<FieldVisitItem> => {
  await checkPermission("leads:edit");
  await checkFieldVisitAccess(id, "edit");

  const existing = await findFieldVisitById(id);
  if (!existing) {
    throw new AppError("Field visit not found", 404, "NOT_FOUND");
  }

  const validatedInput = updateFieldVisitSchema.parse(input);
  const updated = await updateFieldVisitRecord(id, validatedInput);

  // Notify if assignee changed
  if (validatedInput.assignedToId && validatedInput.assignedToId !== existing.assignedToId) {
    const formattedDate = new Date(updated.visitDate).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    await dispatchVisitNotification(
      updated.assignedToId,
      "Field Visit Reassigned",
      `You have been assigned to field visit "${updated.purpose}" scheduled for ${formattedDate}.`,
      updated.id
    );
  }

  return updated;
};

export const completeFieldVisit = async (
  user: AuthenticatedUserPayload,
  id: string,
  input: CompleteFieldVisitInput
): Promise<FieldVisitItem> => {
  await checkPermission("leads:edit");
  await checkFieldVisitAccess(id, "edit");

  const existing = await findFieldVisitById(id);
  if (!existing) {
    throw new AppError("Field visit not found", 404, "NOT_FOUND");
  }

  const validatedInput = completeFieldVisitSchema.parse(input);

  // Update visit record status to completed & save report details
  const updated = await completeFieldVisitRecordRepo(id, validatedInput);

  // 1. If visit is linked to an appointment, mark appointment as completed
  if (existing.appointmentId) {
    try {
      await db
        .update(appointments)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, existing.appointmentId));
    } catch (err) {
      console.error("Failed to auto-complete appointment associated with field visit:", err);
    }
  }

  // 2. Automatically create scheduled next action follow-up if requested
  if (validatedInput.nextAction === "follow_up" || validatedInput.nextAction === "second_visit") {
    const scheduledDate = validatedInput.nextActionDate
      ? new Date(validatedInput.nextActionDate)
      : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // default 3 days out

    try {
      await db.insert(followUps).values({
        id: crypto.randomUUID(),
        leadId: existing.leadId || null,
        customerId: existing.customerId || null,
        scheduledAt: scheduledDate,
        type: validatedInput.nextAction === "second_visit" ? "site_visit" : "call",
        notes: `Automated follow-up created from Field Visit Report (${existing.purpose}). ${validatedInput.summary ? `Summary: ${validatedInput.summary}` : ""}`,
        status: "scheduled",
        createdById: user.id,
        assignedToId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error("Failed to auto-create follow-up from field visit report:", err);
    }
  }

  // 3. Log completion entry in lead activity timeline
  if (existing.leadId) {
    const formattedNextAction = validatedInput.nextAction
      ? `Next Action: ${validatedInput.nextAction.replace("_", " ").toUpperCase()}`
      : "No next action specified";

    await logLeadActivity(
      existing.leadId,
      user.id,
      "meeting",
      `Completed Field Visit Report: "${existing.purpose}". ${validatedInput.summary ? `Summary: ${validatedInput.summary}. ` : ""}${validatedInput.outcome ? `Outcome: ${validatedInput.outcome}. ` : ""}${formattedNextAction}.`
    );
  }

  // 4. Notify Inside Sales / Creator if different from completer
  if (existing.createdById && existing.createdById !== user.id) {
    await dispatchVisitNotification(
      existing.createdById,
      "Field Visit Completed",
      `${user.name} completed the field visit report for "${existing.purpose}".`,
      existing.id
    );
  }

  return updated;
};
