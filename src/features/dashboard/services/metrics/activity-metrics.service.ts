import { db } from "@/db";
import { followUps, appointments, leads, users } from "@/db/schema";
import { count, eq, and, isNull, gte, lte, lt, gt, or, inArray, SQL } from "drizzle-orm";
import type { ResolvedDashboardScopeContext } from "../dashboard-authorization.service";
import type {
  DashboardDateRange,
  DashboardFollowupSummary,
  DashboardAppointmentSummary,
  DashboardOperationalItem,
} from "../../types/dashboard-scope.types";

export const getActivityMetrics = async (
  ctx: ResolvedDashboardScopeContext,
  _dateRange: DashboardDateRange = "30d"
) => {
  let todayCount = 0;
  let overdueCount = 0;
  let upcomingCount = 0;
  let completedCount = 0;

  let upcomingApptCount = 0;
  let completedApptCount = 0;
  let cancelledApptCount = 0;
  let noShowApptCount = 0;

  const priorityItems: DashboardOperationalItem[] = [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  try {
    // 1. Determine user IDs for scope filtering
    let teamUserIds: string[] = [];
    if (ctx.scope === "team" && ctx.teamId) {
      const teamUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.teamId, ctx.teamId), isNull(users.deletedAt)))
        .all();
      teamUserIds = teamUsers.map((u) => u.id);
    }

    // Build follow-up scope filter
    const fuScopeConditions: SQL[] = [];
    if (ctx.scope === "personal") {
      const pOr = or(eq(followUps.assignedToId, ctx.userId), eq(followUps.createdById, ctx.userId));
      if (pOr) fuScopeConditions.push(pOr);
    } else if (ctx.scope === "team") {
      if (teamUserIds.length > 0) {
        const tOr = inArray(followUps.assignedToId, teamUserIds);
        if (tOr) fuScopeConditions.push(tOr);
      } else {
        const uOr = eq(followUps.assignedToId, ctx.userId);
        if (uOr) fuScopeConditions.push(uOr);
      }
    }
    const fuScopeClause = fuScopeConditions.length > 0 ? and(...fuScopeConditions) : undefined;

    // 2. Query Follow-up Metrics
    // Today
    const todayRes = await db
      .select({ count: count() })
      .from(followUps)
      .where(
        and(
          fuScopeClause,
          gte(followUps.scheduledAt, todayStart),
          lte(followUps.scheduledAt, todayEnd),
          eq(followUps.status, "scheduled")
        )
      )
      .get();
    todayCount = todayRes?.count ?? 0;

    // Overdue
    const overdueRes = await db
      .select({ count: count() })
      .from(followUps)
      .where(
        and(
          fuScopeClause,
          lt(followUps.scheduledAt, todayStart),
          eq(followUps.status, "scheduled")
        )
      )
      .get();
    overdueCount = overdueRes?.count ?? 0;

    // Upcoming
    const upcomingRes = await db
      .select({ count: count() })
      .from(followUps)
      .where(
        and(
          fuScopeClause,
          gt(followUps.scheduledAt, todayEnd),
          eq(followUps.status, "scheduled")
        )
      )
      .get();
    upcomingCount = upcomingRes?.count ?? 0;

    // Completed
    const completedRes = await db
      .select({ count: count() })
      .from(followUps)
      .where(
        and(
          fuScopeClause,
          eq(followUps.status, "completed")
        )
      )
      .get();
    completedCount = completedRes?.count ?? 0;

    // 3. Query Appointment Metrics
    const appScopeConditions: SQL[] = [];
    if (ctx.scope === "personal") {
      const pOr = or(eq(appointments.assignedToId, ctx.userId), eq(appointments.createdById, ctx.userId));
      if (pOr) appScopeConditions.push(pOr);
    } else if (ctx.scope === "team") {
      if (teamUserIds.length > 0) {
        const tOr = inArray(appointments.assignedToId, teamUserIds);
        if (tOr) appScopeConditions.push(tOr);
      } else {
        const uOr = eq(appointments.assignedToId, ctx.userId);
        if (uOr) appScopeConditions.push(uOr);
      }
    }
    const appScopeClause = appScopeConditions.length > 0 ? and(...appScopeConditions) : undefined;

    const apptUpcomingRes = await db
      .select({ count: count() })
      .from(appointments)
      .where(and(appScopeClause, gte(appointments.startTime, todayStart), eq(appointments.status, "scheduled")))
      .get();
    upcomingApptCount = apptUpcomingRes?.count ?? 0;

    const apptCompletedRes = await db
      .select({ count: count() })
      .from(appointments)
      .where(and(appScopeClause, eq(appointments.status, "completed")))
      .get();
    completedApptCount = apptCompletedRes?.count ?? 0;

    const apptCancelledRes = await db
      .select({ count: count() })
      .from(appointments)
      .where(and(appScopeClause, eq(appointments.status, "cancelled")))
      .get();
    cancelledApptCount = apptCancelledRes?.count ?? 0;

    const apptNoShowRes = await db
      .select({ count: count() })
      .from(appointments)
      .where(and(appScopeClause, eq(appointments.status, "no_show")))
      .get();
    noShowApptCount = apptNoShowRes?.count ?? 0;

    // 4. Priority Items (overdue + today follow-ups)
    const urgentFollowUps = await db
      .select({
        id: followUps.id,
        scheduledAt: followUps.scheduledAt,
        type: followUps.type,
        notes: followUps.notes,
        status: followUps.status,
        leadId: followUps.leadId,
        leadName: leads.name,
      })
      .from(followUps)
      .leftJoin(leads, eq(followUps.leadId, leads.id))
      .where(and(fuScopeClause, eq(followUps.status, "scheduled"), lte(followUps.scheduledAt, todayEnd)))
      .orderBy(followUps.scheduledAt)
      .limit(5)
      .all();

    for (const fu of urgentFollowUps) {
      const isOverdue = new Date(fu.scheduledAt) < todayStart;
      const dateStr = new Date(fu.scheduledAt).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      priorityItems.push({
        id: fu.id,
        title: `${fu.type.toUpperCase()}: ${fu.leadName || "Lead"}`,
        subtitle: fu.notes || (isOverdue ? "Overdue follow-up" : "Scheduled for today"),
        date: dateStr,
        priority: isOverdue ? "high" : "medium",
        type: "followup",
        status: fu.status,
        href: fu.leadId ? `/sales/leads/${fu.leadId}` : "/sales/follow-ups",
      });
    }
  } catch (_err) {
    todayCount = 0;
    overdueCount = 0;
    upcomingCount = 0;
    completedCount = 0;

    upcomingApptCount = 0;
    completedApptCount = 0;
    cancelledApptCount = 0;
    noShowApptCount = 0;
  }

  const followups: DashboardFollowupSummary = {
    today: todayCount,
    overdue: overdueCount,
    upcoming: upcomingCount,
    completed: completedCount,
  };

  const appointmentsSummary: DashboardAppointmentSummary = {
    upcoming: upcomingApptCount,
    completed: completedApptCount,
    cancelled: cancelledApptCount,
    noShow: noShowApptCount,
  };

  return {
    followups,
    appointments: appointmentsSummary,
    priorityItems,
  };
};

