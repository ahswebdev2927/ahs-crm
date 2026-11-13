import { db } from "@/db";
import { 
  users, roles, leads, leadStages, quotations, payments, 
  followUps, appointments, fieldVisits, customers 
} from "@/db/schema";
import { eq, and, isNull, inArray, gte, lte, SQL, desc } from "drizzle-orm";
import type { 
  ReportsScopeContext, 
  DateRangeBounds, 
  SalespersonReportData, 
  SalespersonPerformanceItem 
} from "../types/reports.types";

/**
 * Functional repository for the Salesperson Report domain.
 * Generates rep leaderboards and individual activity drilldown records.
 */
export const fetchSalespersonReportData = async (
  ctx: ReportsScopeContext,
  bounds: DateRangeBounds
): Promise<SalespersonReportData> => {
  // 1. Identify candidate users based on scope
  const userConditions: SQL[] = [isNull(users.deletedAt)];

  if (ctx.scope === "own" || ctx.targetUserId) {
    const target = ctx.targetUserId || ctx.userId;
    userConditions.push(eq(users.id, target));
  } else if (ctx.scope === "team" && ctx.teamId) {
    userConditions.push(eq(users.teamId, ctx.teamId));
  } else if (ctx.targetTeamId) {
    userConditions.push(eq(users.teamId, ctx.targetTeamId));
  }

  const salesUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      roleName: roles.name,
      roleCode: roles.code,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(...userConditions))
    .all();

  const userIds = salesUsers.map((u) => u.id);
  if (userIds.length === 0) {
    return { leaderboard: [] };
  }

  // 2. Fetch Won / Lost stages
  const stages = await db
    .select({ id: leadStages.id, code: leadStages.code })
    .from(leadStages)
    .all();

  const wonStageId = stages.find((s) => s.code.toLowerCase() === "won")?.id;
  const lostStageId = stages.find((s) => s.code.toLowerCase() === "lost")?.id;

  // 3. Query Leads assigned to these users in date range
  const leadRows = await db
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
        inArray(leads.ownerId, userIds),
        gte(leads.createdAt, bounds.startDate),
        lte(leads.createdAt, bounds.endDate)
      )
    )
    .all();

  // 4. Query Quotations accepted for these users in date range
  const quoteRows = await db
    .select({
      id: quotations.id,
      createdById: quotations.createdById,
      total: quotations.total,
      status: quotations.status,
    })
    .from(quotations)
    .where(
      and(
        inArray(quotations.createdById, userIds),
        eq(quotations.status, "accepted"),
        gte(quotations.createdAt, bounds.startDate),
        lte(quotations.createdAt, bounds.endDate)
      )
    )
    .all();

  // 5. Query Payments collected
  const paymentRows = await db
    .select({
      id: payments.id,
      receivedById: payments.receivedById,
      amount: payments.amount,
      status: payments.status,
    })
    .from(payments)
    .where(
      and(
        inArray(payments.receivedById, userIds),
        eq(payments.status, "completed"),
        gte(payments.paymentDate, bounds.startDate),
        lte(payments.paymentDate, bounds.endDate)
      )
    )
    .all();

  // 6. Query Follow-ups completed
  const followupRows = await db
    .select({
      id: followUps.id,
      assignedToId: followUps.assignedToId,
      status: followUps.status,
    })
    .from(followUps)
    .where(
      and(
        inArray(followUps.assignedToId, userIds),
        eq(followUps.status, "completed"),
        gte(followUps.updatedAt, bounds.startDate),
        lte(followUps.updatedAt, bounds.endDate)
      )
    )
    .all();

  // 7. Query Appointments completed
  const apptRows = await db
    .select({
      id: appointments.id,
      assignedToId: appointments.assignedToId,
      status: appointments.status,
    })
    .from(appointments)
    .where(
      and(
        inArray(appointments.assignedToId, userIds),
        eq(appointments.status, "completed"),
        gte(appointments.updatedAt, bounds.startDate),
        lte(appointments.updatedAt, bounds.endDate)
      )
    )
    .all();

  // 8. Query Field Visits completed
  const visitRows = await db
    .select({
      id: fieldVisits.id,
      assignedToId: fieldVisits.assignedToId,
      status: fieldVisits.status,
    })
    .from(fieldVisits)
    .where(
      and(
        inArray(fieldVisits.assignedToId, userIds),
        eq(fieldVisits.status, "completed"),
        gte(fieldVisits.visitDate, bounds.startDate),
        lte(fieldVisits.visitDate, bounds.endDate)
      )
    )
    .all();

  // 9. Aggregate leaderboard items
  const leaderboard: SalespersonPerformanceItem[] = salesUsers.map((u) => {
    const userLeads = leadRows.filter((l) => l.ownerId === u.id);
    const leadsCount = userLeads.length;
    const wonCount = wonStageId ? userLeads.filter((l) => l.stageId === wonStageId).length : 0;
    const lostCount = lostStageId ? userLeads.filter((l) => l.stageId === lostStageId).length : 0;
    const conversionDenominator = wonCount + lostCount;
    const conversionRate = conversionDenominator > 0
      ? Number(((wonCount / conversionDenominator) * 100).toFixed(1))
      : leadsCount > 0
      ? Number(((wonCount / leadsCount) * 100).toFixed(1))
      : 0;

    const revenuePaise = quoteRows
      .filter((q) => q.createdById === u.id)
      .reduce((sum, q) => sum + q.total, 0);

    const collectionsPaise = paymentRows
      .filter((p) => p.receivedById === u.id)
      .reduce((sum, p) => sum + p.amount, 0);

    const followupsCompleted = followupRows.filter((f) => f.assignedToId === u.id).length;
    const appointmentsCompleted = apptRows.filter((a) => a.assignedToId === u.id).length;
    const fieldVisitsCompleted = visitRows.filter((v) => v.assignedToId === u.id).length;

    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      roleName: u.roleName,
      leadsCount,
      wonCount,
      lostCount,
      conversionRate,
      revenuePaise,
      followupsCompleted,
      appointmentsCompleted,
      fieldVisitsCompleted,
      collectionsPaise,
    };
  });

  // Sort leaderboard descending by revenue and won deals
  leaderboard.sort((a, b) => b.revenuePaise - a.revenuePaise || b.wonCount - a.wonCount);

  // 10. Selected Salesperson Drilldown
  let selectedSalespersonDetails: SalespersonReportData["selectedSalespersonDetails"] = undefined;
  const drilldownUserId = ctx.targetUserId || (ctx.scope === "own" ? ctx.userId : leaderboard[0]?.userId);

  if (drilldownUserId) {
    const targetUser = salesUsers.find((u) => u.id === drilldownUserId);
    if (targetUser) {
      // Fetch total follow-ups, appointments, and visits in interval
      const [allFu, allAppts, allVisits, wonQuotes] = await Promise.all([
        db
          .select({ id: followUps.id, status: followUps.status })
          .from(followUps)
          .where(
            and(
              eq(followUps.assignedToId, drilldownUserId),
              gte(followUps.scheduledAt, bounds.startDate),
              lte(followUps.scheduledAt, bounds.endDate)
            )
          )
          .all(),
        db
          .select({ id: appointments.id, status: appointments.status })
          .from(appointments)
          .where(
            and(
              eq(appointments.assignedToId, drilldownUserId),
              gte(appointments.startTime, bounds.startDate),
              lte(appointments.startTime, bounds.endDate)
            )
          )
          .all(),
        db
          .select({ id: fieldVisits.id, status: fieldVisits.status })
          .from(fieldVisits)
          .where(
            and(
              eq(fieldVisits.assignedToId, drilldownUserId),
              gte(fieldVisits.visitDate, bounds.startDate),
              lte(fieldVisits.visitDate, bounds.endDate)
            )
          )
          .all(),
        db
          .select({
            id: quotations.id,
            total: quotations.total,
            leadId: quotations.leadId,
            customerId: quotations.customerId,
            createdAt: quotations.createdAt,
            leadTitle: leads.name,
            customerName: customers.name,
          })
          .from(quotations)
          .leftJoin(leads, eq(quotations.leadId, leads.id))
          .leftJoin(customers, eq(quotations.customerId, customers.id))
          .where(
            and(
              eq(quotations.createdById, drilldownUserId),
              eq(quotations.status, "accepted"),
              gte(quotations.createdAt, bounds.startDate),
              lte(quotations.createdAt, bounds.endDate)
            )
          )
          .orderBy(desc(quotations.createdAt))
          .limit(10)
          .all(),
      ]);

      selectedSalespersonDetails = {
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          roleName: targetUser.roleName,
        },
        activityBreakdown: {
          followupsTotal: allFu.length,
          followupsCompleted: allFu.filter((f) => f.status === "completed").length,
          appointmentsTotal: allAppts.length,
          appointmentsCompleted: allAppts.filter((a) => a.status === "completed").length,
          fieldVisitsTotal: allVisits.length,
          fieldVisitsCompleted: allVisits.filter((v) => v.status === "completed").length,
        },
        recentWonDeals: wonQuotes.map((q) => ({
          leadId: q.leadId || q.id,
          leadTitle: q.leadTitle || "Direct Proposal",
          customerName: q.customerName || "Corporate Account",
          valuePaise: q.total,
          wonAt: q.createdAt.toISOString(),
        })),
      };
    }
  }

  return {
    leaderboard,
    selectedSalespersonDetails,
  };
};
