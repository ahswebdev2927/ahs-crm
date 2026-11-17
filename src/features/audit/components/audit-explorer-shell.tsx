"use client";

import * as React from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Download,
  RotateCcw,
  Calendar,
  Filter,
  ShieldAlert,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { AuditTable } from "./audit-table";
import { AuditDiffModal } from "./audit-diff-modal";
import type {
  AuditLogRecord,
  AuditQueryResponse,
  AuditFilterOptions,
} from "../schemas/audit.schema";

type DatePreset = "all" | "today" | "7d" | "30d" | "custom";

export function AuditExplorerShell() {
  // Query Filter State
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [entityType, setEntityType] = React.useState<string>("");
  const [action, setAction] = React.useState<string>("");
  const [userId, setUserId] = React.useState<string>("");
  const [datePreset, setDatePreset] = React.useState<DatePreset>("all");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);

  // Data state
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);
  const [data, setData] = React.useState<AuditQueryResponse>({
    items: [],
    pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
  });
  const [filterOptions, setFilterOptions] = React.useState<AuditFilterOptions>({
    actions: [],
    entityTypes: [],
    actors: [],
  });

  // Modal inspection state
  const [selectedEntry, setSelectedEntry] = React.useState<AuditLogRecord | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load distinct filter metadata options on mount
  React.useEffect(() => {
    async function loadFilterMetadata() {
      try {
        const res = await fetch("/api/audit/filters");
        if (res.ok) {
          const json = await res.json();
          if ((json.status || json.success) && json.data) {
            setFilterOptions(json.data);
          }
        }
      } catch (err) {
        console.error("Failed to load audit filters:", err);
      }
    }
    loadFilterMetadata();
  }, []);

  // Compute effective dates from preset
  const effectiveDates = React.useMemo(() => {
    const now = new Date();
    if (datePreset === "today") {
      return {
        start: format(startOfDay(now), "yyyy-MM-dd"),
        end: format(endOfDay(now), "yyyy-MM-dd"),
      };
    }
    if (datePreset === "7d") {
      return {
        start: format(startOfDay(subDays(now, 7)), "yyyy-MM-dd"),
        end: format(endOfDay(now), "yyyy-MM-dd"),
      };
    }
    if (datePreset === "30d") {
      return {
        start: format(startOfDay(subDays(now, 30)), "yyyy-MM-dd"),
        end: format(endOfDay(now), "yyyy-MM-dd"),
      };
    }
    if (datePreset === "custom") {
      return {
        start: startDate || undefined,
        end: endDate || undefined,
      };
    }
    return { start: undefined, end: undefined };
  }, [datePreset, startDate, endDate]);

  // Query audit logs
  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (entityType) params.set("entityType", entityType);
      if (action) params.set("action", action);
      if (userId) params.set("userId", userId);
      if (effectiveDates.start) params.set("startDate", effectiveDates.start);
      if (effectiveDates.end) params.set("endDate", effectiveDates.end);

      const res = await fetch(`/api/audit/logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if ((json.status || json.success) && json.data) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, entityType, action, userId, effectiveDates]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle CSV export of ACTIVE filtered query only
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (entityType) params.set("entityType", entityType);
      if (action) params.set("action", action);
      if (userId) params.set("userId", userId);
      if (effectiveDates.start) params.set("startDate", effectiveDates.start);
      if (effectiveDates.end) params.set("endDate", effectiveDates.end);

      const res = await fetch(`/api/audit/export?${params.toString()}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let filename = `ahs-audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
      if (contentDisposition && contentDisposition.includes("filename=")) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting audit CSV:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setEntityType("");
    setAction("");
    setUserId("");
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const activeFiltersCount = [
    debouncedSearch.trim(),
    entityType,
    action,
    userId,
    datePreset !== "all",
  ].filter(Boolean).length;

  return (
    <div className="w-full space-y-4">
      {/* Filter Toolbar Card */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by keyword, entity ID, actor name, or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {/* Export Action */}
          <div className="flex items-center gap-2 shrink-0">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset ({activeFiltersCount})</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting || data.pagination.total === 0}
              className="h-9 text-xs gap-1.5 font-medium border-primary/20 hover:bg-primary/5 hover:text-primary"
            >
              {exporting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-3.5 text-emerald-600" />
              )}
              <span>Export Filtered CSV</span>
            </Button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          {/* Entity Type Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Entity
            </label>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2 text-xs rounded-md border border-input bg-background font-medium focus:outline-hidden focus:ring-1 focus:ring-ring capitalize"
            >
              <option value="">All Entities</option>
              {filterOptions.entityTypes.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
          </div>

          {/* Action Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Action
            </label>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2 text-xs rounded-md border border-input bg-background font-medium focus:outline-hidden focus:ring-1 focus:ring-ring font-mono"
            >
              <option value="">All Actions</option>
              {filterOptions.actions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          {/* Actor Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Actor
            </label>
            <select
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2 text-xs rounded-md border border-input bg-background font-medium focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              <option value="">All Actors</option>
              {filterOptions.actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Preset Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Time Range
            </label>
            <select
              value={datePreset}
              onChange={(e) => {
                setDatePreset(e.target.value as DatePreset);
                setPage(1);
              }}
              className="h-8 px-2 text-xs rounded-md border border-input bg-background font-medium focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Inputs if Custom Selected */}
          {datePreset === "custom" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 px-2 text-xs rounded-md border border-input bg-background font-medium focus:outline-hidden focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 px-2 text-xs rounded-md border border-input bg-background font-medium focus:outline-hidden focus:ring-1 focus:ring-ring"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Audit Table */}
      <AuditTable
        items={data.items}
        total={data.pagination.total}
        page={data.pagination.page}
        limit={data.pagination.limit}
        totalPages={data.pagination.totalPages}
        loading={loading}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        onSelectEntry={(entry) => {
          setSelectedEntry(entry);
          setModalOpen(true);
        }}
        onResetFilters={handleResetFilters}
      />

      {/* Audit Diff Modal */}
      <AuditDiffModal
        entry={selectedEntry}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
