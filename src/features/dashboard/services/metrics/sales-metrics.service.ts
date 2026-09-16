import { db } from "@/db";
import { users, roles, leads, leadStages, leadPartners } from "@/db/schema";
import { eq, isNull, and, ne, or, count, inArray, gte, lte, SQL } from "drizzle-orm";
import type { ResolvedDashboardScopeContext } from "../dashboard-authorization.service";
import type {
  DashboardDateRange,
  DashboardPipelineDistributionStage,
  DashboardTeamMemberPerformance,
} from "../../types/dashboard-scope.types";
import { getDateRangeBounds } from "../../utils/dashboard-scope.utils";

export const getSalesMetrics = async (
  ctx: ResolvedDashboardScopeContext,
  dateRange: DashboardDateRange = "30d"
) => {
  let pipelineDistribution: DashboardPipelineDistributionStage[] = [];
  let teamPerformance: DashboardTeamMemberPerformance[] = [];

  const bounds = getDateRangeBounds(dateRange);

  try {
    // 1. Resolve user IDs for personal / team scope
    let partnerLeadIds: string[] = [];
    if (ctx.scope === "personal") {
      const partnerRows = await db
        .select({ leadId: leadPartners.leadId })
        .from(leadPartners)
        .where(and(eq(leadPartners.partnerId, ctx.userId), eq(leadPartners.status, "active")))
        .all();
      partnerLeadIds = partnerRows.map((p) => p.leadId);
    }

    let teamUserIds: string[] = [];
    if (ctx.scope === "team" && ctx.teamId) {
      const teamUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.teamId, ctx.teamId), isNull(users.deletedAt)))
        .all();
      teamUserIds = teamUsers.map((u) => u.id);
    }

    // 2. Build scope and date filter conditions
    const conditions: SQL[] = [isNull(leads.deletedAt)];

    if (ctx.scope === "personal") {
      const personalOr =
        partnerLeadIds.length > 0
          ? or(eq(leads.ownerId, ctx.userId), eq(leads.createdById, ctx.userId), inArray(leads.id, partnerLeadIds))
          : or(eq(leads.ownerId, ctx.userId), eq(leads.createdById, ctx.userId));
      if (personalOr) conditions.push(personalOr);
    } else if (ctx.scope === "team") {
      if (teamUserIds.length > 0) {
        const teamOr = inArray(leads.ownerId, teamUserIds);
        if (teamOr) conditions.push(teamOr);
      } else {
        const userOr = eq(leads.ownerId, ctx.userId);
        if (userOr) conditions.push(userOr);
      }
    }

    conditions.push(gte(leads.createdAt, bounds.startDate));
    conditions.push(lte(leads.createdAt, bounds.endDate));

    const filterClause = and(...conditions);

    // 3. Query all lead stages
    const stages = await db
      .select({ id: leadStages.id, code: leadStages.code, name: leadStages.name, order: leadStages.order })
      .from(leadStages)
      .orderBy(leadStages.order)
      .all();

    // 4. Query lead count per stage
    const countsByStage = await db
      .select({ stageId: leads.stageId, count: count() })
      .from(leads)
      .where(filterClause)
      .groupBy(leads.stageId)
      .all();

    const stageCountMap = new Map<number, number>();
    for (const r of countsByStage) {
      if (r.stageId !== null) {
        stageCountMap.set(r.stageId, r.count);
      }
    }

    pipelineDistribution = stages.map((stage) => ({
      stageId: String(stage.id),
      stageName: stage.name,
      count: stageCountMap.get(stage.id) ?? 0,
      totalValue: 0,
    }));

    // 5. Query Team Performance for business / team scopes
    if (ctx.scope === "business" || ctx.scope === "team") {
      const userConditions: SQL[] = [isNull(users.deletedAt)];

      if (ctx.userRoleCode !== "super_admin") {
        userConditions.push(ne(roles.code, "super_admin"));
        const userId = ctx.userId;

        const managerOrNonManager = or(eq(users.id, userId), eq(roles.isManager, false));
        if (managerOrNonManager) userConditions.push(managerOrNonManager);

        if (ctx.teamId) {
          const teamOrManager = or(
            eq(users.teamId, ctx.teamId),
            eq(users.managerId, userId),
            eq(users.id, userId)
          );
          if (teamOrManager) userConditions.push(teamOrManager);
        } else {
          const reportOrSelf = or(eq(users.managerId, userId), eq(users.id, userId));
          if (reportOrSelf) userConditions.push(reportOrSelf);
        }
      }

      const userList = await db
        .select({
          id: users.id,
          name: users.name,
          roleCode: roles.code,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(and(...userConditions))
        .limit(20)
        .all();

      const wonStage = stages.find((s) => s.code.toLowerCase() === "won");

      for (const u of userList) {
        const userLeadRes = await db
          .select({ count: count() })
          .from(leads)
          .where(and(eq(leads.ownerId, u.id), isNull(leads.deletedAt), gte(leads.createdAt, bounds.startDate), lte(leads.createdAt, bounds.endDate)))
          .get();
        const userLeadsCount = userLeadRes?.count ?? 0;

        let userWonCount = 0;
        if (wonStage) {
          const userWonRes = await db
            .select({ count: count() })
            .from(leads)
            .where(
              and(
                eq(leads.ownerId, u.id),
                eq(leads.stageId, wonStage.id),
                isNull(leads.deletedAt),
                gte(leads.createdAt, bounds.startDate),
                lte(leads.createdAt, bounds.endDate)
              )
            )
            .get();
          userWonCount = userWonRes?.count ?? 0;
        }

        const convRate = userLeadsCount > 0 ? Math.round((userWonCount / userLeadsCount) * 100) : 0;

        teamPerformance.push({
          userId: u.id,
          name: u.name,
          leadsCount: userLeadsCount,
          wonCount: userWonCount,
          revenue: 0,
          conversionRate: convRate,
        });
      }
    }
  } catch (_err) {
    pipelineDistribution = [];
    teamPerformance = [];
  }

  return {
    pipelineDistribution,
    teamPerformance,
  };
};

