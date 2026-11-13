import { db } from "@/db";
import { invoices, payments, customers, users } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import type { 
  ReportsScopeContext, 
  DateRangeBounds, 
  PaymentReportData, 
  PaymentAgingBucket 
} from "../types/reports.types";
import { generateTrendIntervalBuckets } from "../utils/reports-date.utils";

/**
 * Functional repository for the Payment & Billing Report domain.
 * Computes billing totals, collections, aging receivables, and efficiency rates.
 */
export const fetchPaymentReportData = async (
  _ctx: ReportsScopeContext,
  bounds: DateRangeBounds
): Promise<PaymentReportData> => {
  // 1. Fetch Invoices issued in period
  const periodInvoices = await db
    .select({
      id: invoices.id,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      amountDue: invoices.amountDue,
      status: invoices.status,
      dueDate: invoices.dueDate,
      issueDate: invoices.issueDate,
    })
    .from(invoices)
    .where(
      and(
        gte(invoices.issueDate, bounds.startDate),
        lte(invoices.issueDate, bounds.endDate)
      )
    )
    .all();

  const totalBilledPaise = periodInvoices.reduce((sum, inv) => sum + inv.total, 0);

  // 2. Fetch Payments completed in period
  const periodPayments = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      invoiceId: payments.invoiceId,
      customerId: payments.customerId,
      receivedById: payments.receivedById,
    })
    .from(payments)
    .where(
      and(
        eq(payments.status, "completed"),
        gte(payments.paymentDate, bounds.startDate),
        lte(payments.paymentDate, bounds.endDate)
      )
    )
    .all();

  const totalCollectedPaise = periodPayments.reduce((sum, p) => sum + p.amount, 0);

  // 3. Outstanding and Overdue Receivables across all active invoices
  const allOpenInvoices = await db
    .select({
      id: invoices.id,
      amountDue: invoices.amountDue,
      dueDate: invoices.dueDate,
      status: invoices.status,
    })
    .from(invoices)
    .all();

  const nowMs = Date.now();
  let outstandingPaise = 0;
  let overduePaise = 0;

  // Aging buckets
  let bucket0to30 = { count: 0, amount: 0 };
  let bucket31to60 = { count: 0, amount: 0 };
  let bucket61to90 = { count: 0, amount: 0 };
  let bucket90Plus = { count: 0, amount: 0 };

  for (const inv of allOpenInvoices) {
    if (inv.status !== "paid" && inv.status !== "cancelled" && inv.status !== "void" && inv.amountDue > 0) {
      outstandingPaise += inv.amountDue;
      const isOverdue = inv.status === "overdue" || inv.dueDate.getTime() < nowMs;

      if (isOverdue) {
        overduePaise += inv.amountDue;
        const daysOverdue = Math.floor((nowMs - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 30) {
          bucket0to30.count += 1;
          bucket0to30.amount += inv.amountDue;
        } else if (daysOverdue <= 60) {
          bucket31to60.count += 1;
          bucket31to60.amount += inv.amountDue;
        } else if (daysOverdue <= 90) {
          bucket61to90.count += 1;
          bucket61to90.amount += inv.amountDue;
        } else {
          bucket90Plus.count += 1;
          bucket90Plus.amount += inv.amountDue;
        }
      } else {
        // Current not overdue
        bucket0to30.count += 1;
        bucket0to30.amount += inv.amountDue;
      }
    }
  }

  const collectionEfficiencyRate = totalBilledPaise > 0
    ? Number(((totalCollectedPaise / totalBilledPaise) * 100).toFixed(1))
    : 100;

  // 4. Billed vs Collected Trend
  const intervals = generateTrendIntervalBuckets(bounds);
  const billedVsCollectedTrend = intervals.map((interval) => {
    const billed = periodInvoices
      .filter(
        (inv) =>
          inv.issueDate.getTime() >= interval.startMs &&
          inv.issueDate.getTime() <= interval.endMs
      )
      .reduce((sum, inv) => sum + inv.total, 0);

    const collected = periodPayments
      .filter(
        (p) =>
          p.paymentDate.getTime() >= interval.startMs &&
          p.paymentDate.getTime() <= interval.endMs
      )
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      date: interval.label,
      billedPaise: billed,
      collectedPaise: collected,
    };
  });

  // 5. Aging Buckets Array
  const agingBuckets: PaymentAgingBucket[] = [
    { range: "Current (0-30d)", invoiceCount: bucket0to30.count, amountPaise: bucket0to30.amount },
    { range: "31-60d", invoiceCount: bucket31to60.count, amountPaise: bucket31to60.amount },
    { range: "61-90d", invoiceCount: bucket61to90.count, amountPaise: bucket61to90.amount },
    { range: "90+d", invoiceCount: bucket90Plus.count, amountPaise: bucket90Plus.amount },
  ];

  // 6. Recent Payments Summary with Customer and Collector names
  const recentPayments = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      invoiceNumber: invoices.invoiceNumber,
      customerName: customers.name,
      receivedByName: users.name,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .leftJoin(customers, eq(payments.customerId, customers.id))
    .leftJoin(users, eq(payments.receivedById, users.id))
    .where(eq(payments.status, "completed"))
    .orderBy(desc(payments.paymentDate))
    .limit(10)
    .all();

  const recentPaymentsSummary = recentPayments.map((p, idx) => ({
    id: p.id,
    paymentNumber: `REC-${1000 + idx}`,
    invoiceNumber: p.invoiceNumber,
    customerName: p.customerName || "Corporate Client",
    amountPaise: p.amount,
    paymentMethod: p.paymentMethod,
    paymentDate: p.paymentDate.toISOString(),
    receivedByName: p.receivedByName || "Accounts Team",
  }));

  return {
    kpis: {
      totalBilledPaise,
      totalCollectedPaise,
      outstandingPaise,
      overduePaise,
      collectionEfficiencyRate,
    },
    billedVsCollectedTrend,
    agingBuckets,
    recentPaymentsSummary,
  };
};
