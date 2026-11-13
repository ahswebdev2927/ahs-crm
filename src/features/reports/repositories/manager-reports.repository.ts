import { db } from "@/db";
import { 
  teams, users, leads, leadStages, quotations, payments, 
  followUps, appointments, fieldVisits, tasks 
} from "@/db/schema";
import { eq, and, isNull, inArray, gte, lte, count, SQL } from "drizzle-orm";
import type { ReportsScopeContext, DateRangeBounds, ManagerReportData } from "../types/reports.types";
import { generateTrendIntervalBuckets } from "../utils/reports-date.utils";

/**
 * Functional repository for the Manager / Team Report domain.
 * Aggregates team summaries, comparative productivity trends, and activity matrices.
 */
export const fetchManagerReportData = async (
  ctx: ReportsScopeContext,
  bounds: DateRangeBounds
): Promise<ManagerReportData> => {
  // 1. Identify Target Team
  let targetTeamId = ctx.targetTeamId || ctx.teamId || 1; // Default to first team if not specified

  const teamRecord = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.id, targetTeamId))
    .get();

  const teamName = teamRecord?.name || "Sales Team";

  // 2. Fetch Team Members
  const memberRows = await db
    .select({
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(and(eq(users.teamId, targetTeamId), isNull(users.deletedAt)))
    .all();

  const memberIds = memberRows.map((m) => m.id);

  if (memberIds.length === 0) {
    return {
      teamSummary: {
        teamId: targetTeamId,
        teamName,
        membersCount: 0,
        totalLeads: 0,
        wonLeads: 0,
        conversionRate: 0,
        totalRevenuePaise: 0,
        totalCollectionsPaise: 0,
      },
      teamComparativeTrend: [],
      memberActivityMatrix: [],
    };
  }

  // 3. Won / Lost Stages
  const stages = await db
    .select({ id: leadStages.id, code: leadStages.code })
    .from(leadStages)
    .all();
  const wonStageId = stages.find((s) => s.code.toLowerCase() === "won")?.id;
  const lostStageId = stages.find((s) => s.code.toLowerCase() === "lost")?.id;

  // 4. Team Leads
  const teamLeads = await db
    .select({
      id: leads.id,
      ownerId: leads.ownerId,
      stageId: leads.stageId,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(
      and(
        isNull(leads.deletedAt),
        inArray(leads.ownerId, memberIds),
        gte(leads.createdAt, bounds.startDate),
        lte(leads.createdAt, bounds.endDate)
      )
    )
    .all();

  const totalLeads = teamLeads.length;
  const wonLeads = wonStageId ? teamLeads.filter((l) => l.stageId === wonStageId).length : 0;
  const lostLeads = lostStageId ? teamLeads.filter((l) => l.stageId === lostStageId).length : 0;
  const convDenominator = wonLeads + lostLeads;
  const conversionRate = convDenominator > 0
    ? Number(((wonLeads / convDenominator) * 100).toFixed(1))
    : totalLeads > 0
    ? Number(((wonLeads / totalLeads) * 100).toFixed(1))
    : 0;

  // 5. Team Quotations (Revenue)
  const teamQuotes = await db
    .select({
      id: quotations.id,
      createdById: quotations.createdById,
      total: quotations.total,
      status: quotations.status,
      createdAt: quotations.createdAt,
    })
    .from(quotations)
    .where(
      and(
        inArray(quotations.createdById, memberIds),
        eq(quotations.status, "accepted"),
        gte(quotations.createdAt, bounds.startDate),
        lte(quotations.createdAt, bounds.endDate)
      )
    )
    .all();

  const totalRevenuePaise = teamQuotes.reduce((sum, q) => sum + q.total, 0);

  // 6. Team Payments (Collections)
  const teamPayments = await db
    .select({
      id: payments.id,
      receivedById: payments.receivedById,
      amount: payments.amount,
      status: payments.status,
    })
    .from(payments)
    .where(
      and(
        inArray(payments.receivedById, memberIds),
        eq(payments.status, "completed"),
        gte(payments.paymentDate, bounds.startDate),
        lte(payments.paymentDate, bounds.endDate)
      )
    )
    .all();

  const totalCollectionsPaise = teamPayments.reduce((sum, p) => sum + p.amount, 0);

  // 7. Team Comparative Trend
  const intervals = generateTrendIntervalBuckets(bounds);
  const teamComparativeTrend = intervals.map((interval) => {
    const leadsInPeriod = teamLeads.filter(
      (l) => l.createdAt.getTime() >= interval.startMs && l.createdAt.getTime() <= interval.endMs
    );
    const wonInPeriod = wonStageId
      ? leadsInPeriod.filter((l) => l.stageId === wonStageId).length
      : 0;
    const revInPeriod = teamQuotes
      .filter(
        (q) =>
          q.createdAt.getTime() >= interval.startMs &&
          q.createdAt.getTime() <= interval.endMs
      )
      .reduce((sum, q) => sum + q.total, 0);

    return {
      period: interval.label,
      teamName,
      leads: leadsInPeriod.length,
      won: wonInPeriod,
      revenuePaise: revInPeriod,
    };
  });

  // 8. Member Activity Matrix
  const [memberFollowups, memberAppointments, memberVisits, memberTasks] = await Promise.all([
    db
      .select({ assignedToId: followUps.assignedToId })
      .from(followUps)
      .where(
        and(
          inArray(followUps.assignedToId, memberIds),
          gte(followUps.scheduledAt, bounds.startDate),
          lte(followUps.scheduledAt, bounds.endDate)
        )
      )
      .all(),
    db
      .select({ assignedToId: appointments.assignedToId })
      .from(appointments)
      .where(
        and(
          inArray(appointments.assignedToId, memberIds),
          gte(appointments.startTime, bounds.startDate),
          lte(appointments.startTime, bounds.endDate)
        )
      )
      .all(),
    db
      .select({ assignedToId: fieldVisits.assignedToId })
      .from(fieldVisits)
      .where(
        and(
          inArray(fieldVisits.assignedToId, memberIds),
          gte(fieldVisits.visitDate, bounds.startDate),
          lte(fieldVisits.visitDate, bounds.endDate)
        )
      )
      .all(),
    db
      .select({ assignedToId: tasks.assignedToId })
      .from(tasks)
      .where(
        and(
          inArray(tasks.assignedToId, memberIds),
          eq(tasks.status, "completed"),
          gte(tasks.updatedAt, bounds.startDate),
          lte(tasks.updatedAt, bounds.endDate)
        )
      )
      .all(),
  ]);

  const memberActivityMatrix = memberRows.map((member) => {
    const mLeads = teamLeads.filter((l) => l.ownerId === member.id).length;
    const mCalls = memberFollowups.filter((f) => f.assignedToId === member.id).length;
    const mMeetings = memberAppointments.filter((a) => a.assignedToId === member.id).length;
    const mVisits = memberVisits.filter((v) => v.assignedToId === member.id).length;
    const mTasks = memberTasks.filter((t) => t.assignedToId === member.id).length;
    const mRevenue = teamQuotes
      .filter((q) => q.createdById === member.id)
      .reduce((sum, q) => sum + q.total, 0);

    return {
      userId: member.id,
      name: member.name,
      leads: mLeads,
      calls: mCalls,
      meetings: mMeetings,
      visits: mVisits,
      tasksDone: mTasks,
      revenuePaise: mRevenue,
    };
  });

  return {
    teamSummary: {
      teamId: targetTeamId,
      teamName,
      membersCount: memberRows.length,
      totalLeads,
      wonLeads,
      conversionRate,
      totalRevenuePaise,
      totalCollectionsPaise,
    },
    teamComparativeTrend,
    memberActivityMatrix,
  };
};
