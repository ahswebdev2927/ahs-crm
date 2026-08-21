import { db } from "@/db";
import { followUps, appointments, tasks } from "@/db/schema";
import { count, eq, and } from "drizzle-orm";
import type { ResolvedDashboardScopeContext } from "../dashboard-authorization.service";
import type {
  DashboardDateRange,
  DashboardFollowupSummary,
  DashboardAppointmentSummary,
  DashboardOperationalItem,
} from "../../types/dashboard-scope.types";

export const getActivityMetrics = async (
  ctx: ResolvedDashboardScopeContext,
  _dateRange: DashboardDateRange
) => {
  let followupCount = 0;
  let appointmentCount = 0;
  const priorityItems: DashboardOperationalItem[] = [];

  try {
    if (ctx.scope === "personal") {
      const fuRes = await db
        .select({ count: count() })
        .from(followUps)
        .where(eq(followUps.assignedToId, ctx.userId))
        .get();
      followupCount = fuRes?.count ?? 0;

      const appRes = await db
        .select({ count: count() })
        .from(appointments)
        .where(eq(appointments.assignedToId, ctx.userId))
        .get();
      appointmentCount = appRes?.count ?? 0;
    } else {
      const fuRes = await db.select({ count: count() }).from(followUps).get();
      followupCount = fuRes?.count ?? 0;

      const appRes = await db.select({ count: count() }).from(appointments).get();
      appointmentCount = appRes?.count ?? 0;
    }
  } catch (_err) {
    followupCount = 0;
    appointmentCount = 0;
  }

  const followups: DashboardFollowupSummary = {
    today: followupCount,
    overdue: 0,
    upcoming: followupCount,
    completed: 0,
  };

  const appointmentsSummary: DashboardAppointmentSummary = {
    upcoming: appointmentCount,
    completed: 0,
    cancelled: 0,
    noShow: 0,
  };

  return {
    followups,
    appointments: appointmentsSummary,
    priorityItems,
  };
};
