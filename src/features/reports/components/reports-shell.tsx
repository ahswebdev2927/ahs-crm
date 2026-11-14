"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-picker";
import { PageHeader } from "@/components/shared/page-header";
import { SalesReportTab } from "./tabs/sales-report-tab";
import { SalespersonReportTab } from "./tabs/salesperson-report-tab";
import { ManagerReportTab } from "./tabs/manager-report-tab";
import { CustomerReportTab } from "./tabs/customer-report-tab";
import { PaymentReportTab } from "./tabs/payment-report-tab";
import type { 
  ReportTab, 
  ReportDatePreset, 
  ReportsResponseData, 
  ReportsFilterOptions 
} from "../types/reports.types";
import { 
  Download, 
  RefreshCw, 
  BarChart3, 
  Users, 
  Briefcase, 
  Wallet, 
  UserSquare2, 
  Calendar as CalendarIcon,
  AlertCircle
} from "lucide-react";
import type { DateRange } from "react-day-picker";

const DATE_PRESETS: Array<{ label: string; value: ReportDatePreset }> = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Quarter", value: "this_quarter" },
  { label: "This Year", value: "this_year" },
  { label: "Custom Range", value: "custom" },
];

/**
 * Functional shell component managing reporting state, filters, tab routing,
 * and data hydration for the Reports & Analytics module.
 */
export function ReportsShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const isRep = user?.roleCode === "inside_sales" || user?.roleCode === "field_sales";

  // URL state synchronization with role awareness
  const defaultTab: ReportTab = isRep ? "salesperson" : "sales";
  const requestedTab = searchParams.get("tab") as ReportTab | null;
  const initialTab: ReportTab = isRep ? "salesperson" : requestedTab || defaultTab;

  const initialPreset = (searchParams.get("preset") as ReportDatePreset) || "30d";
  const initialTeamId = searchParams.get("teamId") ? Number(searchParams.get("teamId")) : undefined;
  const initialUserId = isRep ? user?.id : (searchParams.get("userId") || undefined);

  const [activeTab, setActiveTab] = React.useState<ReportTab>(initialTab);
  const [preset, setPreset] = React.useState<ReportDatePreset>(initialPreset);
  const [teamId, setTeamId] = React.useState<number | undefined>(initialTeamId);
  const [userId, setUserId] = React.useState<string | undefined>(initialUserId);

  // Synchronize when user auth state loads
  React.useEffect(() => {
    if (isRep) {
      setActiveTab("salesperson");
      if (user?.id) {
        setUserId(user.id);
      }
    }
  }, [isRep, user?.id]);

  // Custom date range state
  const [customRange, setCustomRange] = React.useState<DateRange | undefined>(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from && to) {
      return { from: new Date(from), to: new Date(to) };
    }
    return undefined;
  });

  // Data fetching state
  const [reportState, setReportState] = React.useState<ReportsResponseData | null>(null);
  const [filterOptions, setFilterOptions] = React.useState<ReportsFilterOptions>({ teams: [], users: [] });
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Functional fetcher
  const loadReports = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const params = new URLSearchParams();
      params.set("tab", activeTab);
      params.set("preset", preset);

      if (preset === "custom" && customRange?.from && customRange?.to) {
        params.set("fromDate", customRange.from.toISOString());
        params.set("toDate", customRange.to.toISOString());
      }
      if (teamId) params.set("teamId", String(teamId));
      if (userId) params.set("userId", userId);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load report data.");
      }

      setReportState(json.data);
      if (json.data.filterOptions) {
        setFilterOptions(json.data.filterOptions);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to reports service";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, preset, customRange, teamId, userId]);

  React.useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Tab change handler
  const handleTabChange = (val: string) => {
    const nextTab = val as ReportTab;
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`/reports?${params.toString()}`);
  };

  // CSV Export handler
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("tab", activeTab);
      params.set("preset", preset);

      if (preset === "custom" && customRange?.from && customRange?.to) {
        params.set("fromDate", customRange.from.toISOString());
        params.set("toDate", customRange.to.toISOString());
      }
      if (teamId) params.set("teamId", String(teamId));
      if (userId) params.set("userId", userId);

      const downloadUrl = `/api/reports/export?${params.toString()}`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `ahs-${activeTab}-report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 pb-12">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive real-time reporting across sales pipelines, team productivity, customer portfolios, and financial collections."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "System", href: "/reports" },
          { label: "Reports" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadReports}
              disabled={isLoading}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={handleExportCsv}
              disabled={isExporting || isLoading}
              className="h-8 gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
            </Button>
          </div>
        }
      />

      <div className="w-full p-4 sm:p-5 xl:p-6 space-y-6">
        {/* Global Filter Bar */}
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Preset Selector */}
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={preset}
                onValueChange={(val) => {
                  const p = val as ReportDatePreset;
                  setPreset(p);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Range Picker */}
            {preset === "custom" && (
              <DateRangePicker
                dateRange={customRange}
                onDateRangeChange={setCustomRange}
                className="h-8 text-xs"
              />
            )}

            {/* Team Selector (if permitted and not locked to rep) */}
            {!isRep && filterOptions.teams.length > 1 && (
              <Select
                value={teamId ? String(teamId) : "all"}
                onValueChange={(val) => setTeamId(val === "all" ? undefined : Number(val))}
              >
                <SelectTrigger className="h-8 text-xs w-[150px]">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Teams</SelectItem>
                  {filterOptions.teams.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Salesperson Selector (if permitted and not locked to rep) */}
            {!isRep && filterOptions.users.length > 1 && (
              <Select
                value={userId || "all"}
                onValueChange={(val) => setUserId(val === "all" ? undefined : val || undefined)}
              >
                <SelectTrigger className="h-8 text-xs w-[160px]">
                  <SelectValue placeholder="All Representatives" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Representatives</SelectItem>
                  {filterOptions.users.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300 flex items-center gap-2.5 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Tabbed Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-muted/60 p-1 rounded-lg">
            {!isRep && (
              <TabsTrigger value="sales" className="text-xs gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Sales
              </TabsTrigger>
            )}
            <TabsTrigger value="salesperson" className="text-xs gap-1.5">
              <UserSquare2 className="h-3.5 w-3.5" />
              Salesperson
            </TabsTrigger>
            {!isRep && (
              <>
                <TabsTrigger value="manager" className="text-xs gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Manager & Team
                </TabsTrigger>
                <TabsTrigger value="customer" className="text-xs gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  Customers
                </TabsTrigger>
                <TabsTrigger value="payments" className="text-xs gap-1.5">
                  <Wallet className="h-3.5 w-3.5" />
                  Payments
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Loading Skeletons */}
          {isLoading && !reportState && (
            <div className="h-96 w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Computing authoritative reports data...</p>
            </div>
          )}

          {/* Tab Content Panes */}
          {reportState && (
            <>
              <TabsContent value="sales">
                {reportState.tab === "sales" && <SalesReportTab data={reportState.data} />}
              </TabsContent>

              <TabsContent value="salesperson">
                {reportState.tab === "salesperson" && (
                  <SalespersonReportTab
                    data={reportState.data}
                    selectedUserId={userId}
                    onSelectUser={(id) => setUserId(id)}
                  />
                )}
              </TabsContent>

              <TabsContent value="manager">
                {reportState.tab === "manager" && <ManagerReportTab data={reportState.data} />}
              </TabsContent>

              <TabsContent value="customer">
                {reportState.tab === "customer" && <CustomerReportTab data={reportState.data} />}
              </TabsContent>

              <TabsContent value="payments">
                {reportState.tab === "payments" && <PaymentReportTab data={reportState.data} />}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}
