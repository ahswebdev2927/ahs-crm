"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { DashboardScopeSwitcher } from "./dashboard-scope-switcher";
import { DashboardKpiCard } from "./dashboard-kpi-card";
import { RevenueTrendChart } from "./charts/revenue-trend-chart";
import { LeadConversionChart } from "./charts/lead-conversion-chart";
import { PipelineDistributionChart } from "./charts/pipeline-distribution-chart";
import { LeadSourceChart } from "./charts/lead-source-chart";
import { TeamPerformanceTable } from "./charts/team-performance-table";
import { CustomerGrowthChart } from "./charts/customer-growth-chart";
import { PaymentCollectionChart } from "./charts/payment-collection-chart";
import { getAllowedDashboardScopes } from "@/features/dashboard/utils/dashboard-scope.utils";
import type {
  DashboardDataResponse,
  DashboardDateRange,
  DashboardScope,
} from "@/features/dashboard/types/dashboard-scope.types";

export function DashboardShell() {
  const { user } = useAuth();

  const allowedScopes = React.useMemo(() => {
    if (!user) return ["personal"] as DashboardScope[];
    return getAllowedDashboardScopes({
      role: { code: user.roleCode, name: user.roleName },
      permissions: user.permissions || [],
    });
  }, [user]);

  const [activeScope, setActiveScope] = React.useState<DashboardScope>(allowedScopes[0] || "personal");
  const [dateRange, setDateRange] = React.useState<DashboardDateRange>("30d");
  const [data, setData] = React.useState<DashboardDataResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Sync initial scope when allowedScopes change
  React.useEffect(() => {
    if (allowedScopes.length > 0 && !allowedScopes.includes(activeScope)) {
      setActiveScope(allowedScopes[0]);
    }
  }, [allowedScopes, activeScope]);

  const fetchDashboardData = React.useCallback(async (scope: DashboardScope, range: DashboardDateRange) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?scope=${scope}&dateRange=${range}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load dashboard data.");
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred while loading dashboard metrics.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboardData(activeScope, dateRange);
  }, [activeScope, dateRange, fetchDashboardData]);

  const handleScopeChange = (scope: DashboardScope) => {
    setActiveScope(scope);
  };

  const getScopeTitle = () => {
    switch (activeScope) {
      case "business":
        return "Business Overview";
      case "team":
        return "Team Performance";
      case "personal":
        return "My Dashboard";
    }
  };

  const getScopeDescription = () => {
    switch (activeScope) {
      case "business":
        return "Organization-wide metrics, revenue trends, and overall sales conversion";
      case "team":
        return "Team leads, pipeline health, member performance, and pending collections";
      case "personal":
        return "Your operational workload, assigned leads, follow-ups, and sales metrics";
    }
  };

  return (
    <div className="flex-1 space-y-4 sm:space-y-5 p-4 sm:p-5 xl:p-6 w-full">
      <PageHeader
        title={getScopeTitle()}
        description={getScopeDescription()}
        actions={
          <div className="flex items-center gap-2.5">
            <DashboardScopeSwitcher
              allowedScopes={allowedScopes}
              activeScope={activeScope}
              onScopeChange={handleScopeChange}
            />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DashboardDateRange)}
              className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="3m">Last 3 Months</option>
              <option value="6m">Last 6 Months</option>
              <option value="12m">Last 12 Months</option>
            </select>
          </div>
        }
      />

      {isLoading ? (
        <LoadingState type="spinner" />
      ) : error ? (
        <ErrorState
          title="Unable to load dashboard"
          message={error}
          onRetry={() => fetchDashboardData(activeScope, dateRange)}
        />
      ) : !data ? null : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {data.kpis.map((kpi) => (
              <DashboardKpiCard key={kpi.id} metric={kpi} />
            ))}
          </div>

          {/* Row 1: Revenue Trend (2 cols) & Lead Funnel (1 col) */}
          <div className="grid grid-cols-1 gap-4 lg:gap-5 lg:grid-cols-3">
            <RevenueTrendChart data={data.revenueTrend} />
            <LeadConversionChart data={data.leadConversion} />
          </div>

          {/* Row 2: Pipeline Distribution (1 col) & Lead Source Breakdown (2 cols) */}
          <div className="grid grid-cols-1 gap-4 lg:gap-5 lg:grid-cols-3">
            <PipelineDistributionChart data={data.pipelineDistribution} />
            <LeadSourceChart data={data.leadSources} />
          </div>

          {/* Row 3: Customer Growth (1 col) & Payment Collections (1 col) */}
          <div className="grid grid-cols-1 gap-4 lg:gap-5 lg:grid-cols-2">
            <CustomerGrowthChart data={data.customerGrowth} />
            <PaymentCollectionChart data={data.paymentCollections} />
          </div>

          {/* Row 4: Team Sales Performance Table (Team & Business Scopes) */}
          {activeScope !== "personal" && data.teamPerformance && (
            <div className="grid grid-cols-1 gap-4 lg:gap-5">
              <TeamPerformanceTable data={data.teamPerformance} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
