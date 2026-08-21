import { db } from "@/db";
import { invoices, payments } from "@/db/schema";
import { sum } from "drizzle-orm";
import type { ResolvedDashboardScopeContext } from "../dashboard-authorization.service";
import type {
  DashboardDateRange,
  DashboardPaymentCollectionSummary,
  DashboardRevenueTrendPoint,
} from "../../types/dashboard-scope.types";

export const getPaymentMetrics = async (
  _ctx: ResolvedDashboardScopeContext,
  _dateRange: DashboardDateRange
) => {
  let totalBilled = 0;
  let totalCollected = 0;

  try {
    const invRes = await db.select({ total: sum(invoices.total) }).from(invoices).get();
    totalBilled = Number(invRes?.total ?? 0);

    const payRes = await db.select({ total: sum(payments.amount) }).from(payments).get();
    totalCollected = Number(payRes?.total ?? 0);
  } catch (_err) {
    totalBilled = 0;
    totalCollected = 0;
  }

  const outstanding = Math.max(0, totalBilled - totalCollected);
  const overdue = 0; // Calculated when invoice due dates exist

  const paymentCollections: DashboardPaymentCollectionSummary = {
    totalBilled,
    totalCollected,
    outstanding,
    overdue,
  };

  const revenueTrend: DashboardRevenueTrendPoint[] = [
    { date: "Current", revenue: totalBilled, collected: totalCollected, pending: outstanding },
  ];

  return {
    totalRevenue: totalBilled,
    pendingPayments: outstanding,
    paymentCollections,
    revenueTrend,
  };
};
