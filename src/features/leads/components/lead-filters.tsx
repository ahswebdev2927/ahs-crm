"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, X, Filter, SlidersHorizontal, RotateCcw } from "lucide-react";
import type { LeadStageItem, UserSummary } from "../types/lead.types";
import { TableDateFilter } from "@/components/shared/table-date-filter";

export interface LeadFiltersProps {
  stages: LeadStageItem[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedStageId: string;
  onStageChange: (value: string) => void;
  selectedPriority: string;
  onPriorityChange: (value: string) => void;
  selectedSource: string;
  onSourceChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedOwnerId?: string;
  onOwnerChange?: (value: string) => void;
  owners?: UserSummary[];
  dateFrom?: string | null;
  dateTo?: string | null;
  onDateRangeChange: (range: { dateFrom?: string; dateTo?: string }) => void;
  onReset: () => void;
}

export function LeadFilters({
  stages,
  search,
  onSearchChange,
  selectedStageId,
  onStageChange,
  selectedPriority,
  onPriorityChange,
  selectedSource,
  onSourceChange,
  selectedStatus,
  onStatusChange,
  selectedOwnerId = "all",
  onOwnerChange,
  owners = [],
  dateFrom,
  dateTo,
  onDateRangeChange,
  onReset,
}: LeadFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  // Count active advanced filters
  const advancedFilterCount = [
    selectedSource !== "all",
    selectedStatus !== "active",
    selectedOwnerId !== "all",
    Boolean(dateFrom || dateTo),
  ].filter(Boolean).length;

  const hasAnyActiveFilter =
    search.trim() !== "" ||
    selectedStageId !== "all" ||
    selectedPriority !== "all" ||
    advancedFilterCount > 0;

  // Selected Stage label
  const selectedStage = stages.find((s) => s.id.toString() === selectedStageId);
  const stageDisplayLabel =
    selectedStageId === "all"
      ? "Stage: All"
      : selectedStage
      ? `Stage: ${selectedStage.name}`
      : "Stage: All";

  // Selected Priority label
  const priorityDisplayLabel =
    selectedPriority === "all"
      ? "Priority: All"
      : `Priority: ${selectedPriority.charAt(0).toUpperCase() + selectedPriority.slice(1)}`;

  // Selected Source label
  const sourceDisplayLabel =
    selectedSource === "all" ? "Source: All" : `Source: ${selectedSource}`;

  // Selected Owner label
  const selectedOwner = owners.find((u) => u.id === selectedOwnerId);
  const ownerDisplayLabel =
    selectedOwnerId === "all"
      ? "Owner: All"
      : selectedOwner
      ? `Owner: ${selectedOwner.name}`
      : "Owner: All";

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 sm:p-4 space-y-3 shadow-xs">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Input with Clear Button */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, company, email, phone..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Primary Quick Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <div className="w-40 sm:w-44">
            <Select value={selectedStageId} onValueChange={(val) => onStageChange(val || "all")}>
              <SelectTrigger className="h-9 text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Stage: All">
                    {stageDisplayLabel}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span>{stage.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="w-36 sm:w-40">
            <Select value={selectedPriority} onValueChange={(val) => onPriorityChange(val || "all")}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Priority: All">
                  {priorityDisplayLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters Popover */}
          <Popover open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5 border-border bg-background hover:bg-muted/60 relative cursor-pointer"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Filters</span>
                  {advancedFilterCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground"
                    >
                      {advancedFilterCount}
                    </Badge>
                  )}
                </Button>
              }
            />
            <PopoverContent
              className="w-80 p-4 border border-border bg-popover rounded-xl shadow-lg space-y-3.5 z-50"
              align="end"
            >
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <span className="text-xs font-semibold text-foreground">Advanced Filters</span>
                {advancedFilterCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onSourceChange("all");
                      onStatusChange("active");
                      if (onOwnerChange) onOwnerChange("all");
                      onDateRangeChange({ dateFrom: undefined, dateTo: undefined });
                    }}
                    className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-1.5"
                  >
                    Reset
                  </Button>
                )}
              </div>

              {/* Date Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Created Date
                </label>
                <div>
                  <TableDateFilter
                    label="Created"
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    onDateRangeChange={({ dateFrom: df, dateTo: dt }) =>
                      onDateRangeChange({ dateFrom: df, dateTo: dt })
                    }
                    className="w-full justify-between"
                  />
                </div>
              </div>

              {/* Source Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Lead Source
                </label>
                <Select value={selectedSource} onValueChange={(val) => onSourceChange(val || "all")}>
                  <SelectTrigger className="h-9 text-xs w-full">
                    <SelectValue placeholder="Source: All">
                      {sourceDisplayLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Campaign">Campaign</SelectItem>
                    <SelectItem value="Inside Sales">Inside Sales</SelectItem>
                    <SelectItem value="Field Sales">Field Sales</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Owner Filter (Managers/Admins) */}
              {owners.length > 0 && onOwnerChange && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Assigned Owner
                  </label>
                  <Select value={selectedOwnerId} onValueChange={(val) => onOwnerChange(val || "all")}>
                    <SelectTrigger className="h-9 text-xs w-full">
                      <SelectValue placeholder="Owner: All">
                        {ownerDisplayLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Owners</SelectItem>
                      {owners.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Lead Status
                </label>
                <Select value={selectedStatus} onValueChange={(val) => onStatusChange(val || "active")}>
                  <SelectTrigger className="h-9 text-xs w-full">
                    <SelectValue placeholder="Status: Active">
                      {selectedStatus === "active" ? "Status: Active Leads" : "Status: Archived"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Leads</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>

          {/* Reset All Filters Button */}
          {hasAnyActiveFilter && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-9 text-xs text-muted-foreground hover:text-foreground px-2.5 gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
