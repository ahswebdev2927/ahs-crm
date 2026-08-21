import { requireAuth } from "@/features/auth/services/authorization.service";
import { resolveAuthorizedDashboardScope } from "./dashboard-authorization.service";
import { getLeadMetrics } from "./metrics/lead-metrics.service";
import { getSalesMetrics } from "./metrics/sales-metrics.service";
import { getCustomerMetrics } from "./metrics/customer-metrics.service";
import { getPaymentMetrics } from "./metrics/payment-metrics.service";
import { getActivityMetrics } from "./metrics/activity-metrics.service";
import type {
  DashboardDataResponse,
  DashboardDateRange,
  DashboardKpiMetric,
  DashboardScope,
} from "../types/dashboard-scope.types";

export const getDashboardData = async (
  requestedScope?: string | null,
  dateRange: DashboardDateRange = "30d"
): Promise<DashboardDataResponse> => {
  // 1. Server Authentication
  const user = await requireAuth();

  // 2. Server Authorization & Scope Resolution (throws AppError 403 if unauthorized scope requested)
  const scopeCtx = resolveAuthorizedDashboardScope(user, requestedScope);

  // 3. Parallel fetch of authoritative metrics
  const [leadData, salesData, customerData, paymentData, activityData] = await Promise.all([
    getLeadMetrics(scopeCtx, dateRange),
    getSalesMetrics(scopeCtx, dateRange),
    getCustomerMetrics(scopeCtx, dateRange),
    getPaymentMetrics(scopeCtx, dateRange),
    getActivityMetrics(scopeCtx, dateRange),
  ]);

  // 4. Build Scope-Aware KPI Cards
  const kpis: DashboardKpiMetric[] = [];

  if (scopeCtx.scope === "business") {
    kpis.push(
      {
        id: "total_leads",
        title: "Total Leads",
        value: leadData.totalLeads.toLocaleString(),
        rawNumericValue: leadData.totalLeads,
        description: "Organization-wide leads",
        status: "neutral",
      },
      {
        id: "total_customers",
        title: "Total Customers",
        value: customerData.totalCustomers.toLocaleString(),
        rawNumericValue: customerData.totalCustomers,
        description: "Active customer accounts",
        status: "positive",
      },
      {
        id: "total_revenue",
        title: "Revenue",
        value: `₹${paymentData.totalRevenue.toLocaleString("en-IN")}`,
        rawNumericValue: paymentData.totalRevenue,
        description: "Organization total billed",
        status: "positive",
      },
      {
        id: "conversion_rate",
        title: "Conversion Rate",
        value: `${leadData.conversionRate}%`,
        rawNumericValue: leadData.conversionRate,
        description: "Lead to won deal ratio",
        status: leadData.conversionRate >= 15 ? "positive" : "warning",
      }
    );
  } else if (scopeCtx.scope === "team") {
    kpis.push(
      {
        id: "team_leads",
        title: "Team Leads",
        value: leadData.totalLeads.toLocaleString(),
        rawNumericValue: leadData.totalLeads,
        description: "Leads assigned to team",
        status: "neutral",
      },
      {
        id: "team_won_deals",
        title: "Won Deals",
        value: leadData.wonDeals.toLocaleString(),
        rawNumericValue: leadData.wonDeals,
        description: "Team conversions",
        status: "positive",
      },
      {
        id: "team_revenue",
        title: "Team Revenue",
        value: `₹${paymentData.totalRevenue.toLocaleString("en-IN")}`,
        rawNumericValue: paymentData.totalRevenue,
        description: "Total team generated revenue",
        status: "positive",
      },
      {
        id: "pending_collections",
        title: "Pending Collections",
        value: `₹${paymentData.pendingPayments.toLocaleString("en-IN")}`,
        rawNumericValue: paymentData.pendingPayments,
        description: "Outstanding team invoices",
        status: paymentData.pendingPayments > 0 ? "warning" : "positive",
      }
    );
  } else {
    // Personal Scope
    kpis.push(
      {
        id: "my_leads",
        title: "My Leads",
        value: leadData.totalLeads.toLocaleString(),
        rawNumericValue: leadData.totalLeads,
        description: "Assigned & owned leads",
        status: "neutral",
      },
      {
        id: "my_won_deals",
        title: "My Won Deals",
        value: leadData.wonDeals.toLocaleString(),
        rawNumericValue: leadData.wonDeals,
        description: "Personal deals closed",
        status: "positive",
      },
      {
        id: "my_followups",
        title: "Today's Follow-ups",
        value: activityData.followups.today.toLocaleString(),
        rawNumericValue: activityData.followups.today,
        description: "Scheduled for today",
        status: activityData.followups.overdue > 0 ? "warning" : "positive",
      },
      {
        id: "my_revenue",
        title: "My Revenue",
        value: `₹${paymentData.totalRevenue.toLocaleString("en-IN")}`,
        rawNumericValue: paymentData.totalRevenue,
        description: "Personal sales revenue",
        status: "positive",
      }
    );
  }

  return {
    scope: scopeCtx.scope,
    dateRange,
    kpis,
    revenueTrend: paymentData.revenueTrend,
    leadConversion: leadData.leadConversion,
    pipelineDistribution: salesData.pipelineDistribution,
    leadSources: leadData.leadSources,
    teamPerformance: salesData.teamPerformance,
    customerGrowth: customerData.customerGrowth,
    paymentCollections: paymentData.paymentCollections,
    followups: activityData.followups,
    appointments: activityData.appointments,
    priorityItems: activityData.priorityItems,
  };
};
