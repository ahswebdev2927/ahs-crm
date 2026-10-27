import { AppError } from "@/lib/errors/AppError";
import { logSystemEvent } from "@/features/activities/services/activity.service";
import { db } from "@/db";
import { leadActivities, followUps, appointments } from "@/db/schema";
import { sendNotification } from "@/features/notifications/services/notification.service";
import { eq } from "drizzle-orm";
import {
  checkPermission,
  getLeadVisibilityFilter,
  checkFieldVisitAccess,
  checkAppointmentAccess,
} from "@/features/auth/services/authorization.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import {
  findFieldVisits,
  findFieldVisitById,
  findFieldVisitByAppointmentId,
  createFieldVisitRecord,
  updateFieldVisitRecord,
  completeFieldVisitRecord as completeFieldVisitRecordRepo,
  getFieldVisitMetrics,
  createFieldVisitMediaRecord,
  deleteFieldVisitMediaRecord,
} from "../repositories/field-visit.repository";
import { findAppointmentById } from "@/features/appointments/repositories/appointment.repository";
import {
  createFieldVisitSchema,
  updateFieldVisitSchema,
  completeFieldVisitSchema,
  fieldVisitQuerySchema,
  startVisitSchema,
} from "../schemas/field-visit.schema";
import type {
  CreateFieldVisitInput,
  UpdateFieldVisitInput,
  CompleteFieldVisitInput,
  FieldVisitQueryInput,
  StartVisitInput,
} from "../schemas/field-visit.schema";
import type { FieldVisitItem, FieldVisitListResponse, FieldVisitMediaItem } from "../types/field-visit.types";

/**
 * Dispatch notification for field visit events
 */
async function dispatchVisitNotification(
  recipientId: string,
  title: string,
  message: string,
  referenceId: string,
  type: string = "field_visit_completed"
) {
  try {
    await sendNotification({
      recipientId,
      title,
      message,
      category: "appointments",
      type,
      referenceId,
      actionUrl: `/field-visits/${referenceId}`,
    });
  } catch (err) {
    console.error("Failed to create field visit notification:", err);
  }
}

/**
 * Log activity on lead timeline
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

export const getVisitForAppointment = async (
  user: AuthenticatedUserPayload,
  appointmentId: string
): Promise<FieldVisitItem | null> => {
  await checkPermission("leads:view");
  await checkAppointmentAccess(appointmentId, "view");

  return await findFieldVisitByAppointmentId(appointmentId);
};

export const startVisitFromAppointment = async (
  user: AuthenticatedUserPayload,
  appointmentId: string,
  input?: StartVisitInput
): Promise<FieldVisitItem> => {
  await checkPermission("leads:edit");
  await checkAppointmentAccess(appointmentId, "edit");

  const appointment = await findAppointmentById(appointmentId);
  if (!appointment) {
    throw new AppError("Appointment not found", 404, "NOT_FOUND");
  }

  // Authorization: must be assigned representative, creator, manager, or admin
  const isAssigned = appointment.assignedToId === user.id;
  const isCreator = appointment.createdById === user.id;
  const isManagerOrAdmin = user.role.code === "super_admin" || user.role.code === "sales_manager";

  if (!isAssigned && !isCreator && !isManagerOrAdmin) {
    throw new AppError(
      "Only the assigned representative, creator, or a sales manager can start this field visit.",
      403,
      "FORBIDDEN"
    );
  }

  // Check if visit already exists for this appointment
  const existingVisit = await findFieldVisitByAppointmentId(appointmentId);
  if (existingVisit) {
    return existingVisit;
  }

  const validatedInput = startVisitSchema.parse(input || {});
  const visitDate = validatedInput.visitDate ? new Date(validatedInput.visitDate) : new Date();
  const purpose = validatedInput.purpose || appointment.title;

  const created = await createFieldVisitRecord(
    {
      appointmentId,
      leadId: appointment.leadId || undefined,
      customerId: appointment.customerId || undefined,
      visitDate: visitDate.getTime(),
      purpose,
      assignedToId: appointment.assignedToId,
      expenses: 0,
    },
    user.id
  );

  // Update appointment status to in_progress
  if (appointment.status === "scheduled" || appointment.status === "confirmed") {
    await db
      .update(appointments)
      .set({
        status: "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));
  }

  if (appointment.leadId) {
    await logLeadActivity(
      appointment.leadId,
      user.id,
      "meeting",
      `Started Field Visit: "${purpose}" for appointment "${appointment.title}".`
    );
  }

  return created;
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
      created.id,
      "appointment_assigned"
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
      updated.id,
      "appointment_assigned"
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

  if (existing.status === "completed") {
    throw new AppError("This field visit report has already been completed.", 400, "BAD_REQUEST");
  }

  const validatedInput = completeFieldVisitSchema.parse(input);

  // 1. Execute state updates atomically within a database transaction
  const updated = await db.transaction(async (tx) => {
    // 1a. Update visit record status to completed & save report details
    const completedVisit = await completeFieldVisitRecordRepo(id, validatedInput, tx);

    // 1b. If visit is linked to an appointment, mark appointment as completed
    if (existing.appointmentId) {
      await tx
        .update(appointments)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, existing.appointmentId));
    }

    // 1c. Next action handling
    if (validatedInput.nextAction === "follow_up") {
      const scheduledDate = validatedInput.nextActionDate
        ? new Date(validatedInput.nextActionDate)
        : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // default 3 days out

      await tx.insert(followUps).values({
        id: crypto.randomUUID(),
        leadId: existing.leadId || null,
        customerId: existing.customerId || null,
        scheduledAt: scheduledDate,
        type: "call",
        notes: `Follow-up from Field Visit Report (${existing.purpose}). ${validatedInput.summary ? `Summary: ${validatedInput.summary}` : ""}`,
        status: "scheduled",
        createdById: user.id,
        assignedToId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else if (validatedInput.nextAction === "second_visit") {
      // Create a NEW Appointment record (proper architecture)
      const scheduledStartTime = validatedInput.nextActionDate
        ? new Date(validatedInput.nextActionDate)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7 days out
      const scheduledEndTime = new Date(scheduledStartTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      await tx.insert(appointments).values({
        id: crypto.randomUUID(),
        title: `Second Visit: ${existing.purpose}`,
        description: `Follow-up visit scheduled from previous field visit report. Notes: ${validatedInput.summary || ""}`,
        startTime: scheduledStartTime,
        endTime: scheduledEndTime,
        location: existing.appointment?.location || null,
        status: "scheduled",
        leadId: existing.leadId || null,
        customerId: existing.customerId || null,
        createdById: user.id,
        assignedToId: existing.assignedToId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 1d. Log a single completion entry in lead activity timeline
    if (existing.leadId) {
      const formattedNextAction = validatedInput.nextAction
        ? `Next Action: ${validatedInput.nextAction.replace("_", " ").toUpperCase()}`
        : "No next action specified";

      await tx.insert(leadActivities).values({
        id: crypto.randomUUID(),
        leadId: existing.leadId,
        type: "meeting",
        content: `Completed Field Visit Report: "${existing.purpose}". ${validatedInput.summary ? `Summary: ${validatedInput.summary}. ` : ""}${validatedInput.outcome ? `Outcome: ${validatedInput.outcome}. ` : ""}${formattedNextAction}.`,
        createdById: user.id,
        createdAt: new Date(),
      });
    }

    return completedVisit;
  });

  // 2. Dispatch notifications outside transaction
  if (existing.createdById && existing.createdById !== user.id) {
    await dispatchVisitNotification(
      existing.createdById,
      "Field Visit Completed",
      `${user.name} completed the field visit report for "${existing.purpose}".`,
      existing.id,
      "field_visit_completed"
    );
  }

  logSystemEvent({
    leadId: existing.leadId,
    customerId: existing.customerId,
    userId: user.id,
    type: "field_visit",
    subject: `Completed Field Visit: "${existing.purpose}"`,
    description: validatedInput.summary || `Field visit completed with outcome: ${validatedInput.outcome || "N/A"}`,
    outcome: validatedInput.outcome || "held",
    metadata: {
      nextAction: validatedInput.nextAction,
      summary: validatedInput.summary,
    },
  }).catch(() => {});

  return updated;
};

export const attachMediaToVisit = async (
  user: AuthenticatedUserPayload,
  visitId: string,
  data: {
    cloudinaryPublicId: string;
    cloudinaryUrl: string;
    resourceType: "image" | "document";
    caption?: string | null;
  }
): Promise<FieldVisitMediaItem> => {
  await checkPermission("leads:edit");
  await checkFieldVisitAccess(visitId, "edit");

  const visit = await findFieldVisitById(visitId);
  if (!visit) {
    throw new AppError("Field visit not found", 404, "NOT_FOUND");
  }

  return await createFieldVisitMediaRecord({
    fieldVisitId: visitId,
    cloudinaryPublicId: data.cloudinaryPublicId,
    cloudinaryUrl: data.cloudinaryUrl,
    resourceType: data.resourceType,
    caption: data.caption ?? null,
    uploadedById: user.id,
  });
};

export const deleteMediaFromVisit = async (
  user: AuthenticatedUserPayload,
  visitId: string,
  mediaId: string
): Promise<{ success: boolean }> => {
  await checkPermission("leads:edit");
  await checkFieldVisitAccess(visitId, "edit");

  await deleteFieldVisitMediaRecord(mediaId);
  return { success: true };
};
