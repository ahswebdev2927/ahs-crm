import { db } from "@/db";
import { leads, leadStages, users, quotations } from "@/db/schema";
import { count, eq, and, isNull, inArray, gte, lte, or, SQL } from "drizzle-orm";
import type { ReportsScopeContext, DateRangeBounds, SalesReportData } from "../types/reports.types";
import { generateTrendIntervalBuckets } from "../utils/reports-date.utils";

/**
 * Functional repository for the Sales Report domain.
 * Aggregates leads, conversions, stage distributions, and revenue in real-time.
 */
export const fetchSalesReportData = async (
  ctx: ReportsScopeContext,
  bounds: DateRangeBounds
): Promise<SalesReportData> => {
  // 1. Resolve user ID scope
  let scopedUserIds: string[] | null = null;

  if (ctx.targetUserId) {
    scopedUserIds = [ctx.targetUserId];
  } else if (ctx.targetTeamId) {
    const teamMembers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.teamId, ctx.targetTeamId), isNull(users.deletedAt)))
      .all();
    scopedUserIds = teamMembers.map((m) => m.id);
  }

  // 2. Build base conditions for leads
  const leadConditions: (SQL | undefined)[] = [
    isNull(leads.deletedAt),
    gte(leads.createdAt, bounds.startDate),
    lte(leads.createdAt, bounds.endDate),
  ];

  if (scopedUserIds && scopedUserIds.length > 0) {
    const userFilter = inArray(leads.ownerId, scopedUserIds);
    if (userFilter) leadConditions.push(userFilter);
  }

  const leadsFilter = and(...leadConditions);

  // 3. Fetch all lead stages
  const stages = await db
    .select({
      id: leadStages.id,
      name: leadStages.name,
      code: leadStages.code,
      color: leadStages.color,
      order: leadStages.order,
    })
    .from(leadStages)
    .orderBy(leadStages.order)
    .all();

  const wonStage = stages.find((s) => s.code.toLowerCase() === "won");
  const lostStage = stages.find((s) => s.code.toLowerCase() === "lost");

  // 4. Fetch leads count by stage
  const stageCounts = await db
    .select({
      stageId: leads.stageId,
      count: count(),
    })
    .from(leads)
    .where(leadsFilter)
    .groupBy(leads.stageId)
    .all();

  const stageCountMap = new Map<number, number>();
  for (const row of stageCounts) {
    if (row.stageId !== null) {
      stageCountMap.set(row.stageId, row.count);
    }
  }

  const leadsCreated = stageCounts.reduce((sum, row) => sum + row.count, 0);
  const dealsWon = wonStage ? (stageCountMap.get(wonStage.id) ?? 0) : 0;
  const dealsLost = lostStage ? (stageCountMap.get(lostStage.id) ?? 0) : 0;
  const conversionDenominator = dealsWon + dealsLost;
  const conversionRate = conversionDenominator > 0
    ? Number(((dealsWon / conversionDenominator) * 100).toFixed(1))
    : leadsCreated > 0
    ? Number(((dealsWon / leadsCreated) * 100).toFixed(1))
    : 0;

  // 5. Query Revenue from accepted quotations
  const quoteConditions: (SQL | undefined)[] = [
    gte(quotations.createdAt, bounds.startDate),
    lte(quotations.createdAt, bounds.endDate),
    or(eq(quotations.status, "accepted"), eq(quotations.status, "sent")),
  ];
  if (scopedUserIds && scopedUserIds.length > 0) {
    const qUser = inArray(quotations.createdById, scopedUserIds);
    if (qUser) quoteConditions.push(qUser);
  }

  const acceptedQuotes = await db
    .select({
      id: quotations.id,
      total: quotations.total,
      status: quotations.status,
      createdAt: quotations.createdAt,
    })
    .from(quotations)
    .where(and(...quoteConditions))
    .all();

  const totalRevenuePaise = acceptedQuotes
    .filter((q) => q.status === "accepted")
    .reduce((sum, q) => sum + q.total, 0);

  const averageDealValuePaise = dealsWon > 0 ? Math.round(totalRevenuePaise / dealsWon) : 0;

  // 6. Build Time-Series Trend
  const intervals = generateTrendIntervalBuckets(bounds);
  const rawLeadsInBounds = await db
    .select({
      id: leads.id,
      stageId: leads.stageId,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(leadsFilter)
    .all();

  const leadsAndRevenueTrend = intervals.map((interval) => {
    const leadsInInterval = rawLeadsInBounds.filter(
      (l) => l.createdAt.getTime() >= interval.startMs && l.createdAt.getTime() <= interval.endMs
    );
    const wonInInterval = wonStage
      ? leadsInInterval.filter((l) => l.stageId === wonStage.id).length
      : 0;

    const revInInterval = acceptedQuotes
      .filter(
        (q) =>
          q.status === "accepted" &&
          q.createdAt.getTime() >= interval.startMs &&
          q.createdAt.getTime() <= interval.endMs
      )
      .reduce((sum, q) => sum + q.total, 0);

    return {
      date: interval.label,
      leadsCreated: leadsInInterval.length,
      dealsWon: wonInInterval,
      revenuePaise: revInInterval,
    };
  });

  // 7. Pipeline Stage Distribution
  const pipelineStageDistribution = stages.map((stage, idx) => {
    const c = stageCountMap.get(stage.id) ?? 0;
    const nextStage = stages[idx + 1];
    const nextCount = nextStage ? (stageCountMap.get(nextStage.id) ?? 0) : 0;
    const conversionRateToNext = c > 0 ? Number(((nextCount / c) * 100).toFixed(1)) : undefined;

    return {
      stageId: stage.id,
      stageName: stage.name,
      stageColor: stage.color,
      order: stage.order,
      leadCount: c,
      totalValuePaise: 0,
      conversionRateToNext,
    };
  });

  // 8. Leads by Source
  const sourceRows = await db
    .select({
      source: leads.source,
      stageId: leads.stageId,
    })
    .from(leads)
    .where(leadsFilter)
    .all();

  const sourceMap = new Map<string, { count: number; won: number }>();
  for (const row of sourceRows) {
    const src = row.source || "Direct / Website";
    const current = sourceMap.get(src) ?? { count: 0, won: 0 };
    current.count += 1;
    if (wonStage && row.stageId === wonStage.id) {
      current.won += 1;
    }
    sourceMap.set(src, current);
  }

  const leadsBySource = Array.from(sourceMap.entries()).map(([source, stats]) => ({
    source,
    count: stats.count,
    wonCount: stats.won,
    conversionRate: stats.count > 0 ? Number(((stats.won / stats.count) * 100).toFixed(1)) : 0,
  }));

  return {
    kpis: {
      leadsCreated,
      dealsWon,
      dealsLost,
      conversionRate,
      totalRevenuePaise,
      averageDealValuePaise,
    },
    leadsAndRevenueTrend,
    pipelineStageDistribution,
    leadsBySource,
  };
};
