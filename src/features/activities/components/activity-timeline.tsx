"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Search,
  RefreshCw,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityCategory, ActivityItem, ActivityCategoryCounts } from "../types/activity.types";
import { ActivityQuickLogger } from "./activity-quick-logger";
import { ActivityTimelineItem } from "./activity-timeline-item";

export interface ActivityTimelineProps {
  leadId?: string;
  customerId?: string;
  className?: string;
  hideQuickLogger?: boolean;
}

export function ActivityTimeline({
  leadId,
  customerId,
  className,
  hideQuickLogger = false,
}: ActivityTimelineProps) {
  const [category, setCategory] = React.useState<ActivityCategory>("all");
  const [searchInput, setSearchInput] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);
  const [limit] = React.useState<number>(20);
  const [refreshKey, setRefreshKey] = React.useState<number>(0);

  const [items, setItems] = React.useState<ActivityItem[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [counts, setCounts] = React.useState<ActivityCategoryCounts>({
    all: 0,
    communication: 0,
    lifecycle: 0,
    commercial: 0,
  });
  const [isLoading, setIsLoading] = React.useState<boolean>(Boolean(leadId || customerId));
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchTimeline = React.useCallback(() => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  React.useEffect(() => {
    if (!leadId && !customerId) return;

    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams();
        if (leadId) params.set("leadId", leadId);
        if (customerId) params.set("customerId", customerId);
        params.set("category", category);
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        params.set("page", String(page));
        params.set("limit", String(limit));

        const res = await fetch(`/api/activities?${params.toString()}`);
        const data = await res.json();
        if (ignore) return;

        if (!res.ok) {
          throw new Error(data.message || "Failed to load activity timeline.");
        }

        setItems(data.data.items || []);
        setTotal(data.data.total || 0);
        setTotalPages(data.data.totalPages || 1);
        if (data.data.counts) {
          setCounts(data.data.counts);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load timeline.";
          setErrorMsg(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [leadId, customerId, category, debouncedSearch, page, limit, refreshKey]);

  const handleCategorySelect = (newCategory: ActivityCategory) => {
    setCategory(newCategory);
    setPage(1);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick Communication Logger */}
      {!hideQuickLogger && (
        <ActivityQuickLogger
          leadId={leadId}
          customerId={customerId}
          onActivityLogged={fetchTimeline}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => handleCategorySelect("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all flex items-center gap-1.5",
                category === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>All</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1 py-0 h-4 min-w-[18px] flex items-center justify-center font-bold",
                  category === "all" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background"
                )}
              >
                {counts.all}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => handleCategorySelect("communication")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all flex items-center gap-1.5",
                category === "communication"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>Communications</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1 py-0 h-4 min-w-[18px] flex items-center justify-center font-bold",
                  category === "communication" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background"
                )}
              >
                {counts.communication}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => handleCategorySelect("lifecycle")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all flex items-center gap-1.5",
                category === "lifecycle"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>Lifecycle</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1 py-0 h-4 min-w-[18px] flex items-center justify-center font-bold",
                  category === "lifecycle" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background"
                )}
              >
                {counts.lifecycle}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => handleCategorySelect("commercial")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all flex items-center gap-1.5",
                category === "commercial"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>Commercial</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1 py-0 h-4 min-w-[18px] flex items-center justify-center font-bold",
                  category === "commercial" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background"
                )}
              >
                {counts.commercial}
              </Badge>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-60 shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search timeline..."
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
        </div>
      </div>

      {/* Main Timeline Stream */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs">
        {/* Stream Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
          <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
            <History className="h-4 w-4 text-primary" />
            <span>Activity History</span>
            <span className="text-xs font-normal text-muted-foreground">
              ({total} {total === 1 ? "record" : "records"})
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTimeline}
            disabled={isLoading}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4 py-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 pl-2">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
                  <div className="h-14 bg-muted/60 animate-pulse rounded-lg w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMsg && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-2 text-center">
            <AlertCircle className="h-5 w-5 mx-auto" />
            <p className="font-medium">{errorMsg}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTimeline}
              className="h-7 text-xs"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMsg && items.length === 0 && (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
              <FileText className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No activities found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {debouncedSearch
                  ? `No events matched your search keyword "${debouncedSearch}".`
                  : category !== "all"
                  ? `No events found in the "${category}" category.`
                  : "Log your first note, call, meeting, or message using the quick logger above."}
              </p>
            </div>
            {(category !== "all" || debouncedSearch) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCategory("all");
                  setSearchInput("");
                }}
                className="h-7 text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Timeline Items List */}
        {!isLoading && !errorMsg && items.length > 0 && (
          <div className="space-y-1">
            {items.map((item) => (
              <ActivityTimelineItem
                key={item.id}
                activity={item}
                onActivityUpdated={fetchTimeline}
                onActivityDeleted={fetchTimeline}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && !errorMsg && totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border text-xs text-muted-foreground">
            <div>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} records
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 text-xs gap-1"
              >
                <ChevronLeft className="h-3 w-3" />
                <span>Previous</span>
              </Button>
              <span className="px-2 font-medium text-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 text-xs gap-1"
              >
                <span>Next</span>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
