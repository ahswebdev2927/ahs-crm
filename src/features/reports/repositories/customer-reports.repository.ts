import { db } from "@/db";
import { customers, customerServices, services, invoices } from "@/db/schema";
import { count, eq, and, isNull, gte, lte, sql } from "drizzle-orm";
import type { ReportsScopeContext, DateRangeBounds, CustomerReportData } from "../types/reports.types";
import { generateTrendIntervalBuckets } from "../utils/reports-date.utils";

/**
 * Functional repository for the Customer Report domain.
 * Aggregates client portfolio growth, active services, and adoption statistics.
 */
export const fetchCustomerReportData = async (
  _ctx: ReportsScopeContext,
  bounds: DateRangeBounds
): Promise<CustomerReportData> => {
  // 1. Total active customer count
  const totalCustRes = await db
    .select({ count: count() })
    .from(customers)
    .where(isNull(customers.deletedAt))
    .get();
  const totalCustomers = totalCustRes?.count ?? 0;

  // 2. New customers created in period
  const newCustRes = await db
    .select({ count: count() })
    .from(customers)
    .where(
      and(
        isNull(customers.deletedAt),
        gte(customers.createdAt, bounds.startDate),
        lte(customers.createdAt, bounds.endDate)
      )
    )
    .get();
  const newCustomersInPeriod = newCustRes?.count ?? 0;

  // 3. Active service subscriptions
  const activeSubsRes = await db
    .select({ count: count() })
    .from(customerServices)
    .where(eq(customerServices.status, "active"))
    .get();
  const activeContractsCount = activeSubsRes?.count ?? 0;

  // 4. Invoiced Revenue for Customer Base
  const invoiceRows = await db
    .select({
      total: invoices.total,
    })
    .from(invoices)
    .where(
      and(
        gte(invoices.issueDate, bounds.startDate),
        lte(invoices.issueDate, bounds.endDate)
      )
    )
    .all();

  const totalInvoicedPaise = invoiceRows.reduce((sum, inv) => sum + inv.total, 0);
  const averageCustomerRevenuePaise = totalCustomers > 0
    ? Math.round(totalInvoicedPaise / totalCustomers)
    : 0;

  // 5. Customer Growth Trend
  const intervals = generateTrendIntervalBuckets(bounds);
  const allCustomers = await db
    .select({ createdAt: customers.createdAt })
    .from(customers)
    .where(isNull(customers.deletedAt))
    .all();

  let runningCumulative = allCustomers.filter((c) => c.createdAt.getTime() < bounds.startMs).length;

  const customerGrowthTrend = intervals.map((interval) => {
    const inPeriod = allCustomers.filter(
      (c) => c.createdAt.getTime() >= interval.startMs && c.createdAt.getTime() <= interval.endMs
    ).length;
    runningCumulative += inPeriod;
    return {
      date: interval.label,
      newCustomers: inPeriod,
      cumulativeCustomers: runningCumulative,
    };
  });

  // 6. Top Services Purchased
  const subRows = await db
    .select({
      serviceId: customerServices.serviceId,
      serviceName: customerServices.serviceNameSnapshot,
      category: customerServices.categorySnapshot,
      totalPrice: customerServices.totalPrice,
    })
    .from(customerServices)
    .all();

  const serviceMap = new Map<number, { name: string; category: string; count: number; revenue: number }>();
  for (const row of subRows) {
    const sId = row.serviceId;
    const curr = serviceMap.get(sId) ?? {
      name: row.serviceName || "Marketing Plan",
      category: row.category || "General",
      count: 0,
      revenue: 0,
    };
    curr.count += 1;
    curr.revenue += row.totalPrice || 0;
    serviceMap.set(sId, curr);
  }

  const topServicesPurchased = Array.from(serviceMap.entries())
    .map(([serviceId, s]) => ({
      serviceId,
      serviceName: s.name,
      category: s.category,
      adoptionCount: s.count,
      totalRevenuePaise: s.revenue,
    }))
    .sort((a, b) => b.adoptionCount - a.adoptionCount)
    .slice(0, 8);

  return {
    kpis: {
      totalCustomers,
      newCustomersInPeriod,
      activeContractsCount,
      averageCustomerRevenuePaise,
    },
    customerGrowthTrend,
    topServicesPurchased,
  };
};
