import { checkPermission } from "@/features/auth/services/authorization.service";
import { resolveAuthorizedReportsScope } from "./reports-authorization.service";
import { resolveReportDateBounds } from "../utils/reports-date.utils";
import { fetchSalesReportData } from "../repositories/sales-reports.repository";
import { fetchSalespersonReportData } from "../repositories/salesperson-reports.repository";
import { fetchManagerReportData } from "../repositories/manager-reports.repository";
import { fetchCustomerReportData } from "../repositories/customer-reports.repository";
import { fetchPaymentReportData } from "../repositories/payment-reports.repository";
import { fetchReportsFilterOptions } from "../repositories/reports-filter-options.repository";
import type { ReportsFilterInput } from "../schemas/reports-filter.schema";
import type { ReportsResponseData } from "../types/reports.types";

/**
 * Functional Service orchestrator for Reports & Analytics.
 * Enforces server RBAC, resolves scope & date intervals, and delegates to domain repositories.
 * Strictly 100% functional programming with zero classes.
 */
export const getReportsData = async (input: ReportsFilterInput): Promise<ReportsResponseData> => {
  // 1. Server-side Authentication & Permission check
  const user = await checkPermission("reports:view");

  // 2. Resolve authorized scope (throws 403 on role/scope violation)
  const scopeCtx = resolveAuthorizedReportsScope(user, input.tab, input.userId, input.teamId);

  // 3. Resolve authoritative date bounds
  const bounds = resolveReportDateBounds(input.preset, input.fromDate, input.toDate);

  // 4. Fetch scope-filtered option lists for UI dropdowns
  const filterOptions = await fetchReportsFilterOptions(scopeCtx);

  // 5. Functional repository dispatch based on active tab
  switch (input.tab) {
    case "sales": {
      const data = await fetchSalesReportData(scopeCtx, bounds);
      return { tab: "sales", data, filterOptions };
    }
    case "salesperson": {
      const data = await fetchSalespersonReportData(scopeCtx, bounds);
      return { tab: "salesperson", data, filterOptions };
    }
    case "manager": {
      const data = await fetchManagerReportData(scopeCtx, bounds);
      return { tab: "manager", data, filterOptions };
    }
    case "customer": {
      const data = await fetchCustomerReportData(scopeCtx, bounds);
      return { tab: "customer", data, filterOptions };
    }
    case "payments": {
      const data = await fetchPaymentReportData(scopeCtx, bounds);
      return { tab: "payments", data, filterOptions };
    }
    default: {
      const data = await fetchSalesReportData(scopeCtx, bounds);
      return { tab: "sales", data, filterOptions };
    }
  }
};
