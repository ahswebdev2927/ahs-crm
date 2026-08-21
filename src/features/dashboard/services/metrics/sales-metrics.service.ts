import { db } from "@/db";
import { users, roles } from "@/db/schema";
import { eq, isNull, and, ne, or, SQL } from "drizzle-orm";
import type { ResolvedDashboardScopeContext } from "../dashboard-authorization.service";
import type {
  DashboardDateRange,
  DashboardPipelineDistributionStage,
  DashboardTeamMemberPerformance,
} from "../../types/dashboard-scope.types";

export const getSalesMetrics = async (
  ctx: ResolvedDashboardScopeContext,
  _dateRange: DashboardDateRange
) => {
  const pipelineDistribution: DashboardPipelineDistributionStage[] = [
    { stageId: "new", stageName: "New Leads", count: 0, totalValue: 0 },
    { stageId: "contacted", stageName: "Contacted", count: 0, totalValue: 0 },
    { stageId: "qualified", stageName: "Qualified", count: 0, totalValue: 0 },
    { stageId: "proposal", stageName: "Proposal Sent", count: 0, totalValue: 0 },
    { stageId: "negotiation", stageName: "Negotiation", count: 0, totalValue: 0 },
  ];

  let teamPerformance: DashboardTeamMemberPerformance[] = [];

  if (ctx.scope === "business" || ctx.scope === "team") {
    try {
      const conditions: SQL[] = [isNull(users.deletedAt)];

      if (ctx.userRoleCode !== "super_admin") {
        // Exclude SuperAdmins
        conditions.push(ne(roles.code, "super_admin"));

        const userId = ctx.userId;

        // Exclude other team managers (Manager sees self + non-manager team members)
        const managerOrNonManager = or(eq(users.id, userId), eq(roles.isManager, false));
        if (managerOrNonManager) conditions.push(managerOrNonManager);

        // Filter by assigned team or direct reports
        if (ctx.teamId) {
          const teamOrManager = or(
            eq(users.teamId, ctx.teamId),
            eq(users.managerId, userId),
            eq(users.id, userId)
          );
          if (teamOrManager) conditions.push(teamOrManager);
        } else {
          const reportOrSelf = or(eq(users.managerId, userId), eq(users.id, userId));
          if (reportOrSelf) conditions.push(reportOrSelf);
        }
      }

      const userList = await db
        .select({
          id: users.id,
          name: users.name,
          roleCode: roles.code,
          isManager: roles.isManager,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(and(...conditions))
        .limit(20)
        .all();

      teamPerformance = userList.map((u) => ({
        userId: u.id,
        name: u.name,
        leadsCount: 0,
        wonCount: 0,
        revenue: 0,
        conversionRate: 0,
      }));
    } catch (_err) {
      teamPerformance = [];
    }
  }

  return {
    pipelineDistribution,
    teamPerformance,
  };
};
