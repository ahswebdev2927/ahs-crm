import { db } from "@/db";
import { customers } from "@/db/schema";
import { count } from "drizzle-orm";
import type { ResolvedDashboardScopeContext } from "../dashboard-authorization.service";
import type { DashboardDateRange, DashboardCustomerGrowthPoint } from "../../types/dashboard-scope.types";

export const getCustomerMetrics = async (
  _ctx: ResolvedDashboardScopeContext,
  _dateRange: DashboardDateRange
) => {
  let totalCustomersCount = 0;

  try {
    const res = await db.select({ count: count() }).from(customers).get();
    totalCustomersCount = res?.count ?? 0;
  } catch (_err) {
    totalCustomersCount = 0;
  }

  const customerGrowth: DashboardCustomerGrowthPoint[] = [
    { date: "Current", newCustomers: 0, totalCustomers: totalCustomersCount },
  ];

  return {
    totalCustomers: totalCustomersCount,
    customerGrowth,
  };
};
