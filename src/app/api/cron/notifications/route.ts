import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  appointments,
  tasks,
  followUps,
  notifications,
} from "@/db/schema";
import { eq, and, gt, lt, gte, lte, ne, isNotNull } from "drizzle-orm";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { AppError } from "@/lib/errors/AppError";
import { logger } from "@/lib/logger";
import {
  sendNotification,
  purgeOldNotifications,
} from "@/features/notifications/services/notification.service";

/**
 * GET /api/cron/notifications
 * Secret-protected scheduled worker route:
 * 1. Alerts field reps of appointments starting in the next 30 minutes.
 * 2. Alerts team members of overdue tasks (throttled to max 1 per 12h per task).
 * 3. Alerts owners of overdue follow-ups (throttled to max 1 per 12h per follow-up).
 * 4. Cleans up read notifications older than 60 days.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const incomingSecret =
    request.headers.get("x-cron-secret") || searchParams.get("secret");
  const systemSecret =
    process.env.CRON_SECRET || "development_cron_secret_key";

  if (!incomingSecret || incomingSecret !== systemSecret) {
    throw new AppError("Unauthorized cron trigger.", 401, "UNAUTHORIZED");
  }

  const now = new Date();
  const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  let appointmentAlertsCount = 0;
  let taskAlertsCount = 0;
  let followupAlertsCount = 0;

  // 1. Upcoming Appointments (starting within the next 30 minutes)
  const upcomingAppointments = await db
    .select({
      id: appointments.id,
      title: appointments.title,
      startTime: appointments.startTime,
      assignedToId: appointments.assignedToId,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "scheduled"),
        gte(appointments.startTime, now),
        lte(appointments.startTime, thirtyMinutesLater)
      )
    );

  for (const appt of upcomingAppointments) {
    // Avoid duplicate reminder for the same appointment
    const [alreadyAlerted] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, appt.assignedToId),
          eq(notifications.type, "appointment_reminder"),
          eq(notifications.referenceId, appt.id)
        )
      )
      .limit(1);

    if (!alreadyAlerted) {
      const timeStr = new Date(appt.startTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      await sendNotification({
        recipientId: appt.assignedToId,
        title: "Upcoming Appointment in 30m",
        message: `Your appointment "${appt.title}" starts soon at ${timeStr}.`,
        category: "appointments",
        type: "appointment_reminder",
        actionUrl: `/appointments/${appt.id}`,
        referenceId: appt.id,
      });

      appointmentAlertsCount++;
    }
  }

  // 2. Overdue Tasks (past due date, not completed, max 1 alert per 12h)
  const overdueTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      assignedToId: tasks.assignedToId,
    })
    .from(tasks)
    .where(
      and(
        ne(tasks.status, "completed"),
        ne(tasks.status, "cancelled"),
        isNotNull(tasks.dueDate),
        lt(tasks.dueDate, now),
        isNotNull(tasks.assignedToId)
      )
    );

  for (const task of overdueTasks) {
    if (!task.assignedToId) continue;

    const [recentAlert] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, task.assignedToId),
          eq(notifications.type, "task_overdue"),
          eq(notifications.referenceId, task.id),
          gt(notifications.createdAt, twelveHoursAgo)
        )
      )
      .limit(1);

    if (!recentAlert) {
      await sendNotification({
        recipientId: task.assignedToId,
        title: "Overdue Task Reminder",
        message: `Task "${task.title}" is overdue. Please review and update its status.`,
        category: "tasks",
        type: "task_overdue",
        actionUrl: `/tasks/${task.id}`,
        referenceId: task.id,
      });

      taskAlertsCount++;
    }
  }

  // 3. Overdue Follow-ups (scheduled in the past, not completed)
  const overdueFollowUps = await db
    .select({
      id: followUps.id,
      type: followUps.type,
      scheduledAt: followUps.scheduledAt,
      assignedToId: followUps.assignedToId,
    })
    .from(followUps)
    .where(
      and(
        eq(followUps.status, "scheduled"),
        lt(followUps.scheduledAt, now)
      )
    );

  for (const fu of overdueFollowUps) {
    const [recentAlert] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, fu.assignedToId),
          eq(notifications.type, "followup_overdue"),
          eq(notifications.referenceId, fu.id),
          gt(notifications.createdAt, twelveHoursAgo)
        )
      )
      .limit(1);

    if (!recentAlert) {
      const typeLabel = fu.type ? fu.type.toUpperCase() : "FOLLOW-UP";
      await sendNotification({
        recipientId: fu.assignedToId,
        title: "Overdue Follow-up",
        message: `Your scheduled ${typeLabel} follow-up is overdue.`,
        category: "leads",
        type: "followup_overdue",
        actionUrl: `/followups/${fu.id}`,
        referenceId: fu.id,
      });

      followupAlertsCount++;
    }
  }

  // 4. Auto-purge read notifications older than 60 days
  const purgedCount = await purgeOldNotifications(60);

  logger.info(
    {
      event: "CRON_NOTIFICATIONS_COMPLETED",
      appointmentAlertsCount,
      taskAlertsCount,
      followupAlertsCount,
      purgedCount,
      timestamp: now.toISOString(),
    },
    `Scheduled notifications check complete: ${appointmentAlertsCount} appointments, ${taskAlertsCount} tasks, ${followupAlertsCount} follow-ups, ${purgedCount} purged`
  );

  return successResponse({
    statusCode: 200,
    message: "Scheduled notifications check executed successfully.",
    data: {
      appointmentAlertsCount,
      taskAlertsCount,
      followupAlertsCount,
      purgedCount,
      timestamp: now.toISOString(),
    },
  });
});
