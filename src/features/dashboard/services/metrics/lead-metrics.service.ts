import { db } from "@/db";
import { leads, leadStages, leadPartners, users } from "@/db/schema";
import { count, eq, and, isNull, inArray, gte, lte, or, SQL } from "drizzle-orm";
import type { ResolvedDashboardScopeContext } from "../dashboard-authorization.service";
import type {
  DashboardDateRange,
  DashboardLeadConversionStage,
  DashboardLeadSourcePoint,
} from "../../types/dashboard-scope.types";
import { getDateRangeBounds } from "../../utils/dashboard-scope.utils";

export const getLeadMetrics = async (
  ctx: ResolvedDashboardScopeContext,
  dateRange: DashboardDateRange = "30d"
) => {
  let totalCount = 0;
  let wonCount = 0;
  let lostCount = 0;
  let leadSources: DashboardLeadSourcePoint[] = [];
  let leadConversion: DashboardLeadConversionStage[] = [];

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

    // Apply date range to creation time
    conditions.push(gte(leads.createdAt, bounds.startDate));
    conditions.push(lte(leads.createdAt, bounds.endDate));

    const filterClause = and(...conditions);

    // 3. Query total count
    const totalRes = await db
      .select({ count: count() })
      .from(leads)
      .where(filterClause)
      .get();
    totalCount = totalRes?.count ?? 0;

    // 4. Query stages and counts per stage
    const stages = await db
      .select({ id: leadStages.id, code: leadStages.code, name: leadStages.name, order: leadStages.order })
      .from(leadStages)
      .orderBy(leadStages.order)
      .all();

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

    for (const stage of stages) {
      const c = stageCountMap.get(stage.id) ?? 0;
      if (stage.code.toLowerCase() === "won") {
        wonCount += c;
      } else if (stage.code.toLowerCase() === "lost") {
        lostCount += c;
      }
    }

    // 5. Query lead sources
    const sourceRows = await db
      .select({ source: leads.source, count: count() })
      .from(leads)
      .where(filterClause)
      .groupBy(leads.source)
      .all();

    if (sourceRows && sourceRows.length > 0) {
      leadSources = sourceRows.map((r) => ({
        source: r.source || "Direct / Organic",
        count: r.count,
        percentage: totalCount > 0 ? Math.round((r.count / totalCount) * 100) : 0,
      }));
    } else {
      leadSources = [
        { source: "Website", count: 0, percentage: 0 },
        { source: "Referral", count: 0, percentage: 0 },
        { source: "Cold Call", count: 0, percentage: 0 },
        { source: "WhatsApp", count: 0, percentage: 0 },
        { source: "Social Media", count: 0, percentage: 0 },
      ];
    }

    // 6. Build Conversion Funnel
    // Simplified, dynamic 7-stage funnel:
    // Total, New Leads, Contacted, Qualified, In-Progress (all intermediate stages), Won, Lost
    if (stages.length > 0) {
      const getCountByCode = (code: string) =>
        stages
          .filter((s) => s.code.toLowerCase() === code)
          .reduce((sum, s) => sum + (stageCountMap.get(s.id) ?? 0), 0);

      const newCount = getCountByCode("new");
      const contactedCount = getCountByCode("contacted");
      const qualifiedCount = getCountByCode("qualified");

      const qualifiedStage = stages.find((s) => s.code.toLowerCase() === "qualified");
      const qualifiedOrder = qualifiedStage?.order ?? 3;
      const fixedCodes = new Set(["new", "contacted", "qualified", "won", "lost"]);

      // Dynamically group all stages between Qualified and Won/Lost
      const inProgressStages = stages.filter((s) => {
        const code = s.code.toLowerCase();
        if (fixedCodes.has(code)) return false;
        return s.order > qualifiedOrder;
      });

      const inProgressCount = inProgressStages.reduce(
        (sum, s) => sum + (stageCountMap.get(s.id) ?? 0),
        0
      );

      const calcPct = (c: number) => (totalCount > 0 ? Math.round((c / totalCount) * 100) : 0);

      leadConversion = [
        { stage: "Total", count: totalCount, percentage: totalCount > 0 ? 100 : 0 },
        { stage: "New Leads", count: newCount, percentage: calcPct(newCount) },
        { stage: "Contacted", count: contactedCount, percentage: calcPct(contactedCount) },
        { stage: "Qualified", count: qualifiedCount, percentage: calcPct(qualifiedCount) },
        { stage: "In-Progress", count: inProgressCount, percentage: calcPct(inProgressCount) },
        { stage: "Won", count: wonCount, percentage: calcPct(wonCount) },
        { stage: "Lost", count: lostCount, percentage: calcPct(lostCount) },
      ];
    } else {
      const conversionRateCalc = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;
      leadConversion = [
        { stage: "Total", count: totalCount, percentage: totalCount > 0 ? 100 : 0 },
        { stage: "New Leads", count: 0, percentage: 0 },
        { stage: "Contacted", count: 0, percentage: 0 },
        { stage: "Qualified", count: 0, percentage: 0 },
        { stage: "In-Progress", count: 0, percentage: 0 },
        { stage: "Won", count: wonCount, percentage: conversionRateCalc },
        { stage: "Lost", count: lostCount, percentage: totalCount > 0 ? Math.round((lostCount / totalCount) * 100) : 0 },
      ];
    }
  } catch {
    totalCount = 0;
    wonCount = 0;
    lostCount = 0;
    leadSources = [
      { source: "Website", count: 0, percentage: 0 },
      { source: "Referral", count: 0, percentage: 0 },
      { source: "Cold Call", count: 0, percentage: 0 },
      { source: "WhatsApp", count: 0, percentage: 0 },
      { source: "Social Media", count: 0, percentage: 0 },
    ];
    leadConversion = [
      { stage: "Total", count: 0, percentage: 0 },
      { stage: "New Leads", count: 0, percentage: 0 },
      { stage: "Contacted", count: 0, percentage: 0 },
      { stage: "Qualified", count: 0, percentage: 0 },
      { stage: "In-Progress", count: 0, percentage: 0 },
      { stage: "Won", count: 0, percentage: 0 },
      { stage: "Lost", count: 0, percentage: 0 },
    ];
  }

  const conversionRate = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;

  return {
    totalLeads: totalCount,
    wonDeals: wonCount,
    lostDeals: lostCount,
    conversionRate,
    leadConversion,
    leadSources,
  };
};

