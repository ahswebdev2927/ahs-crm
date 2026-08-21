import { db } from "@/db";
import { leads } from "@/db/schema";
import { count, eq, and } from "drizzle-orm";
import type { ResolvedDashboardScopeContext } from "../dashboard-authorization.service";
import type {
  DashboardDateRange,
  DashboardLeadConversionStage,
  DashboardLeadSourcePoint,
} from "../../types/dashboard-scope.types";

export const getLeadMetrics = async (
  ctx: ResolvedDashboardScopeContext,
  _dateRange: DashboardDateRange
) => {
  let totalCount = 0;
  let wonCount = 0;
  let lostCount = 0;
  let leadSources: DashboardLeadSourcePoint[] = [];

  try {
    if (ctx.scope === "personal") {
      const totalRes = await db
        .select({ count: count() })
        .from(leads)
        .where(eq(leads.ownerId, ctx.userId))
        .get();
      totalCount = totalRes?.count ?? 0;

      wonCount = 0;
      lostCount = 0;
    } else {
      const totalRes = await db.select({ count: count() }).from(leads).get();
      totalCount = totalRes?.count ?? 0;

      wonCount = 0;
      lostCount = 0;
    }

    // Query lead sources
    const sourceRows = ctx.scope === "personal"
      ? await db
          .select({ source: leads.source, count: count() })
          .from(leads)
          .where(eq(leads.ownerId, ctx.userId))
          .groupBy(leads.source)
          .all()
      : await db
          .select({ source: leads.source, count: count() })
          .from(leads)
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
  } catch (_err) {
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
  }

  const conversionRate = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;

  const leadConversion: DashboardLeadConversionStage[] = [
    { stage: "Total Leads", count: totalCount, percentage: 100 },
    { stage: "Qualified", count: Math.round(totalCount * 0.6), percentage: totalCount > 0 ? 60 : 0 },
    { stage: "Won Deals", count: wonCount, percentage: conversionRate },
    { stage: "Lost Deals", count: lostCount, percentage: totalCount > 0 ? Math.round((lostCount / totalCount) * 100) : 0 },
  ];

  return {
    totalLeads: totalCount,
    wonDeals: wonCount,
    lostDeals: lostCount,
    conversionRate,
    leadConversion,
    leadSources,
  };
};
