import { db } from "@/db";
import { invoices, payments, users } from "@/db/schema";
import { and, eq, gte, lte, notInArray, isNull, inArray, SQL } from "drizzle-orm";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import type { ResolvedDashboardScopeContext } from "../dashboard-authorization.service";
import type {
  DashboardDateRange,
  DashboardPaymentCollectionSummary,
  DashboardRevenueTrendPoint,
} from "../../types/dashboard-scope.types";
import { getDateRangeBounds, DateRangeBounds } from "../../utils/dashboard-scope.utils";

/**
 * Generates discrete time-series buckets for the revenue trend chart.
 * - Daily buckets ('DD MMM', e.g. '09 Nov') for intervals <= 30 days (7d, 30d, this_month, last_month, today).
 * - Monthly buckets ('MMM YYYY', e.g. 'Nov 2026') for intervals > 1-2 months (3m, 6m, 12m).
 */
function generateTrendBuckets(
  dateRange: DashboardDateRange,
  bounds: DateRangeBounds
): { startMs: number; endMs: number; label: string }[] {
  const isMonthly = dateRange === "3m" || dateRange === "6m" || dateRange === "12m";
  const buckets: { startMs: number; endMs: number; label: string }[] = [];

  if (isMonthly) {
    const numMonths = dateRange === "3m" ? 3 : dateRange === "6m" ? 6 : 12;
    const now = new Date();
    for (let i = numMonths - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const end = i === 0 ? bounds.endDate : endOfMonth(monthDate);
      buckets.push({
        startMs: start.getTime(),
        endMs: end.getTime(),
        label: format(start, "MMM yyyy"),
      });
    }
  } else {
    const start = new Date(bounds.startDate);
    const end = new Date(bounds.endDate);
    const current = new Date(start);

    while (current <= end) {
      const dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 23, 59, 59, 999);
      buckets.push({
        startMs: dayStart.getTime(),
        endMs: Math.min(dayEnd.getTime(), bounds.endMs),
        label: format(dayStart, "dd MMM"),
      });
      current.setDate(current.getDate() + 1);
    }
  }

  return buckets;
}

export const getPaymentMetrics = async (
  ctx: ResolvedDashboardScopeContext,
  dateRange: DashboardDateRange = "30d"
) => {
  let totalBilled = 0;
  let totalCollected = 0;
  let revenueTrend: DashboardRevenueTrendPoint[] = [];

  const bounds = getDateRangeBounds(dateRange);

  try {
    // 1. Resolve user IDs for personal / team scope
    let teamUserIds: string[] = [];
    if (ctx.scope === "team" && ctx.teamId) {
      const teamUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.teamId, ctx.teamId), isNull(users.deletedAt)))
        .all();
      teamUserIds = teamUsers.map((u) => u.id);
    }

    // 2. Build payment conditions (completed payments only within date range and scope)
    const paymentConditions: SQL[] = [
      eq(payments.status, "completed"),
      gte(payments.paymentDate, bounds.startDate),
      lte(payments.paymentDate, bounds.endDate),
    ];

    if (ctx.scope === "personal") {
      paymentConditions.push(eq(payments.receivedById, ctx.userId));
    } else if (ctx.scope === "team" && ctx.teamId) {
      if (teamUserIds.length > 0) {
        paymentConditions.push(inArray(payments.receivedById, teamUserIds));
      } else {
        paymentConditions.push(eq(payments.receivedById, "__none__"));
      }
    }

    // 3. Build invoice conditions (active invoices within date range)
    const invoiceConditions: SQL[] = [
      notInArray(invoices.status, ["cancelled", "void"]),
      gte(invoices.issueDate, bounds.startDate),
      lte(invoices.issueDate, bounds.endDate),
    ];

    // Fetch filtered payments
    const paymentRows = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        paymentDate: payments.paymentDate,
      })
      .from(payments)
      .where(and(...paymentConditions))
      .all();

    // Fetch filtered invoices
    const invoiceRows = await db
      .select({
        id: invoices.id,
        total: invoices.total,
        issueDate: invoices.issueDate,
      })
      .from(invoices)
      .where(and(...invoiceConditions))
      .all();

    totalCollected = paymentRows.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    totalBilled = invoiceRows.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    // 4. Generate time-series buckets for revenue trend (scaled to Rupees for plotting)
    const buckets = generateTrendBuckets(dateRange, bounds);

    revenueTrend = buckets.map((bucket) => {
      const bucketBilledPaise = invoiceRows
        .filter((inv) => {
          const t = new Date(inv.issueDate).getTime();
          return t >= bucket.startMs && t <= bucket.endMs;
        })
        .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

      const bucketCollectedPaise = paymentRows
        .filter((p) => {
          const t = new Date(p.paymentDate).getTime();
          return t >= bucket.startMs && t <= bucket.endMs;
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const billedRupees = Math.round(bucketBilledPaise / 100);
      const collectedRupees = Math.round(bucketCollectedPaise / 100);
      const pendingRupees = Math.max(0, billedRupees - collectedRupees);

      return {
        date: bucket.label,
        revenue: billedRupees,
        collected: collectedRupees,
        pending: pendingRupees,
      };
    });
  } catch (_err) {
    totalBilled = 0;
    totalCollected = 0;
    revenueTrend = [];
  }

  const outstanding = Math.max(0, totalBilled - totalCollected);
  const overdue = 0;

  const paymentCollections: DashboardPaymentCollectionSummary = {
    totalBilled,
    totalCollected,
    outstanding,
    overdue,
  };

  return {
    totalRevenue: totalCollected, // Authoritative: only payments collected are shown in revenue
    pendingPayments: outstanding,
    paymentCollections,
    revenueTrend,
  };
};
