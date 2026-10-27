import { AppError } from "@/lib/errors/AppError";
import { logSystemEvent } from "@/features/activities/services/activity.service";
import { db } from "@/db";
import { leadActivities } from "@/db/schema";
import { sendNotification } from "@/features/notifications/services/notification.service";
import {
  checkPermission,
  checkAppointmentAccess,
  getLeadVisibilityFilter,
} from "@/features/auth/services/authorization.service";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import {
  findAppointments,
  findAppointmentById,
  findAppointmentWithFieldVisit,
  createAppointmentRecord,
  updateAppointmentRecord,
  updateAppointmentStatusRecord,
  getAppointmentMetrics,
  getFieldSalesUsers as getFieldSalesUsersRepo,
} from "../repositories/appointment.repository";
import { findFollowUps } from "@/features/followups/repositories/followup.repository";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  appointmentQuerySchema,
} from "../schemas/appointment.schema";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  UpdateAppointmentStatusInput,
  RescheduleAppointmentInput,
  CancelAppointmentInput,
  AppointmentQueryInput,
} from "../schemas/appointment.schema";
import type { AppointmentItem, AppointmentWithVisit, AppointmentListResponse, FieldSalesUser, CalendarEvent } from "../types/appointment.types";
import { adaptToCalendarEvents } from "../utils/calendar-adapter";

/**
 * Helper to dispatch assignment notification to assigned Field Sales representative
 */
async function dispatchAssignmentNotification(
  assignedToId: string,
  title: string,
  appointmentTitle: string,
  appointmentId: string,
  dateStr: string
) {
  try {
    await sendNotification({
      recipientId: assignedToId,
      title,
      message: `You have been assigned to appointment "${appointmentTitle}" scheduled for ${dateStr}.`,
      category: "appointments",
      type: "appointment:assigned",
      actionUrl: `/appointments/${appointmentId}`,
      referenceId: appointmentId,
    });
  } catch (err) {
    console.error("Failed to create appointment assignment notification:", err);
  }
}

/**
 * Helper to log lead activity history entry
 */
async function logLeadActivity(
  leadId: string,
  userId: string,
  type: "note" | "call" | "email" | "meeting",
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
    console.error("Failed to log lead activity:", err);
  }
}

export const getAppointments = async (
  user: AuthenticatedUserPayload,
  params: AppointmentQueryInput
): Promise<AppointmentListResponse> => {
  await checkPermission("leads:view");

  const validatedParams = appointmentQuerySchema.parse(params);

  const visibilityFilter = getLeadVisibilityFilter(
    user.id,
    user.role.code,
    user.dataVisibility,
    user.teamId
  );

  const { items, total } = await findAppointments(visibilityFilter, validatedParams);
  const metrics = await getAppointmentMetrics(visibilityFilter, validatedParams);

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

export const getAppointmentById = async (
  user: AuthenticatedUserPayload,
  id: string
): Promise<AppointmentItem> => {
  await checkPermission("leads:view");
  await checkAppointmentAccess(id, "view");

  const appointment = await findAppointmentById(id);
  if (!appointment) {
    throw new AppError("Appointment record not found", 404, "NOT_FOUND");
  }

  return appointment;
};

export const getAppointmentWithVisitById = async (
  user: AuthenticatedUserPayload,
  id: string
): Promise<AppointmentWithVisit> => {
  await checkPermission("leads:view");
  await checkAppointmentAccess(id, "view");

  const appointmentWithVisit = await findAppointmentWithFieldVisit(id);
  if (!appointmentWithVisit) {
    throw new AppError("Appointment record not found", 404, "NOT_FOUND");
  }

  return appointmentWithVisit;
};

export const createAppointment = async (
  user: AuthenticatedUserPayload,
  input: CreateAppointmentInput
): Promise<AppointmentItem> => {
  await checkPermission("leads:edit");

  const validatedInput = createAppointmentSchema.parse(input);

  const created = await createAppointmentRecord(validatedInput, user.id);

  const formattedDate = new Date(created.startTime).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Notify assigned Field Sales representative if assigned to another user
  if (created.assignedToId && created.assignedToId !== user.id) {
    await dispatchAssignmentNotification(
      created.assignedToId,
      "New Appointment Assigned",
      created.title,
      created.id,
      formattedDate
    );
  }

  // Log activity record if associated with lead
  if (created.leadId) {
    await logLeadActivity(
      created.leadId,
      user.id,
      "meeting",
      `Scheduled Appointment: ${created.title} for ${formattedDate} with ${created.assignedTo.name}.`
    );
  }

  logSystemEvent({
    leadId: created.leadId,
    customerId: created.customerId,
    userId: user.id,
    type: "appointment",
    subject: `Scheduled Appointment: ${created.title}`,
    description: `Appointment scheduled for ${formattedDate} with ${created.assignedTo?.name || "assigned agent"}. Location: ${created.location || "N/A"}`,
    outcome: "scheduled",
    metadata: {
      appointmentTitle: created.title,
      appointmentLocation: created.location,
    },
    createdAt: created.createdAt,
  }).catch(() => {});

  return created;
};

export const updateAppointment = async (
  user: AuthenticatedUserPayload,
  id: string,
  input: UpdateAppointmentInput
): Promise<AppointmentItem> => {
  await checkPermission("leads:edit");

  const existing = await findAppointmentById(id);
  if (!existing) {
    throw new AppError("Appointment not found", 404, "NOT_FOUND");
  }

  const isInsideTeam = user.role.code !== "field_sales";
  const isCreatorOrAssignee = user.id === existing.createdById || user.id === existing.assignedToId;
  if (!isInsideTeam && !isCreatorOrAssignee) {
    throw new AppError("Only Inside team members, the appointment creator, or assigned representative can edit appointment details.", 403, "FORBIDDEN");
  }

  const validatedInput = updateAppointmentSchema.parse(input);
  const updated = await updateAppointmentRecord(id, validatedInput);

  // If assignee changed, notify the new assignee
  if (validatedInput.assignedToId && validatedInput.assignedToId !== existing.assignedToId) {
    const formattedDate = new Date(updated.startTime).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    await dispatchAssignmentNotification(
      updated.assignedToId,
      "Appointment Reassigned",
      updated.title,
      updated.id,
      formattedDate
    );
  }

  return updated;
};

export const updateAppointmentStatus = async (
  user: AuthenticatedUserPayload,
  id: string,
  input: UpdateAppointmentStatusInput
): Promise<AppointmentItem> => {
  await checkPermission("leads:edit");

  const existing = await findAppointmentById(id);
  if (!existing) {
    throw new AppError("Appointment not found", 404, "NOT_FOUND");
  }

  const isInsideTeam = user.role.code !== "field_sales";
  const isCreatorOrAssignee = user.id === existing.createdById || user.id === existing.assignedToId;
  if (!isInsideTeam && !isCreatorOrAssignee) {
    throw new AppError("Only Inside team members, the appointment creator, or assigned representative can update appointment status.", 403, "FORBIDDEN");
  }

  const validatedInput = updateAppointmentStatusSchema.parse(input);
  const updated = await updateAppointmentStatusRecord(id, validatedInput.status, {
    notes: validatedInput.notes,
  });

  if (updated.leadId) {
    await logLeadActivity(
      updated.leadId,
      user.id,
      "meeting",
      `Appointment Status Changed: ${updated.title} is now ${updated.status}. ${validatedInput.notes ? `Notes: ${validatedInput.notes}` : ''}`
    );
  }

  return updated;
};

export const rescheduleAppointment = async (
  user: AuthenticatedUserPayload,
  id: string,
  input: RescheduleAppointmentInput
): Promise<AppointmentItem> => {
  await checkPermission("leads:edit");

  const existing = await findAppointmentById(id);
  if (!existing) {
    throw new AppError("Appointment not found", 404, "NOT_FOUND");
  }

  const isInsideTeam = user.role.code !== "field_sales";
  const isCreatorOrAssignee = user.id === existing.createdById || user.id === existing.assignedToId;
  if (!isInsideTeam && !isCreatorOrAssignee) {
    throw new AppError("Only Inside team members, the appointment creator, or assigned representative can reschedule appointments.", 403, "FORBIDDEN");
  }

  const validatedInput = rescheduleAppointmentSchema.parse(input);
  const updated = await updateAppointmentStatusRecord(id, "rescheduled", {
    startTime: validatedInput.startTime,
    endTime: validatedInput.endTime,
    rescheduleReason: validatedInput.rescheduleReason,
  });

  const formattedDate = new Date(updated.startTime).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (updated.leadId) {
    await logLeadActivity(
      updated.leadId,
      user.id,
      "meeting",
      `Rescheduled Appointment: ${updated.title} to ${formattedDate}. Reason: ${validatedInput.rescheduleReason}`
    );
  }

  // Notify assigned Field Sales representative of reschedule
  if (updated.assignedToId) {
    await dispatchAssignmentNotification(
      updated.assignedToId,
      "Appointment Rescheduled",
      updated.title,
      updated.id,
      formattedDate
    );
  }

  return updated;
};

export const cancelAppointment = async (
  user: AuthenticatedUserPayload,
  id: string,
  input: CancelAppointmentInput
): Promise<AppointmentItem> => {
  await checkPermission("leads:edit");

  const existing = await findAppointmentById(id);
  if (!existing) {
    throw new AppError("Appointment not found", 404, "NOT_FOUND");
  }

  const isInsideTeam = user.role.code !== "field_sales";
  const isCreatorOrAssignee = user.id === existing.createdById || user.id === existing.assignedToId;
  if (!isInsideTeam && !isCreatorOrAssignee) {
    throw new AppError("Only Inside team members, the appointment creator, or assigned representative can cancel appointments.", 403, "FORBIDDEN");
  }

  const validatedInput = cancelAppointmentSchema.parse(input);
  const updated = await updateAppointmentStatusRecord(id, "cancelled", {
    cancellationReason: validatedInput.cancellationReason,
  });

  if (updated.leadId) {
    await logLeadActivity(
      updated.leadId,
      user.id,
      "meeting",
      `Cancelled Appointment: ${updated.title}. Reason: ${validatedInput.cancellationReason}`
    );
  }

  return updated;
};

export const getFieldSalesUsers = async (
  user: AuthenticatedUserPayload
): Promise<FieldSalesUser[]> => {
  await checkPermission("leads:view");
  return getFieldSalesUsersRepo();
};

export const getCalendarEvents = async (
  user: AuthenticatedUserPayload,
  startDate?: number,
  endDate?: number
): Promise<CalendarEvent[]> => {
  await checkPermission("leads:view");

  const visibilityFilter = getLeadVisibilityFilter(
    user.id,
    user.role.code,
    user.dataVisibility,
    user.teamId
  );

  // Query appointments within date range
  const { items: appointments } = await findAppointments(visibilityFilter, {
    page: 1,
    limit: 500,
    startDate,
    endDate,
  });

  // Query follow-ups within date range
  const { items: followUps } = await findFollowUps(visibilityFilter, {
    page: 1,
    limit: 500,
    timeframe: "all",
    sortBy: "scheduledAt",
    sortOrder: "asc",
  });

  return adaptToCalendarEvents(appointments, followUps);
};
