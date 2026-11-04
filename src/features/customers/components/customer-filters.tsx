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
import {
  Search,
  X,
  Sparkles,
  Link as LinkIcon,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import type { UserSummary } from "../types/customer.types";
import { TableDateFilter } from "@/components/shared/table-date-filter";

export interface ServiceOption {
  id: number;
  name: string;
}

export interface CustomerFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedOrigin: string;
  onOriginChange: (value: string) => void;
  selectedOwnerId: string;
  onOwnerChange: (value: string) => void;
  owners?: UserSummary[];
  selectedServiceId?: string;
  onServiceChange?: (value: string) => void;
  services?: ServiceOption[];
  dateFrom?: string | null;
  dateTo?: string | null;
  onDateRangeChange: (range: { dateFrom?: string; dateTo?: string }) => void;
  onReset: () => void;
}

export function CustomerFilters({
  search,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedOrigin,
  onOriginChange,
  selectedOwnerId,
  onOwnerChange,
  owners = [],
  selectedServiceId = "all",
  onServiceChange,
  services = [],
  dateFrom,
  dateTo,
  onDateRangeChange,
  onReset,
}: CustomerFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  // Count active advanced filters
  const advancedFilterCount = [
    selectedServiceId !== "all",
    selectedOwnerId !== "all",
    Boolean(dateFrom || dateTo),
  ].filter(Boolean).length;

  const hasAnyActiveFilter =
    search.trim() !== "" ||
    selectedStatus !== "all" ||
    selectedOrigin !== "all" ||
    advancedFilterCount > 0;

  const selectedOwner = owners.find((u) => u.id === selectedOwnerId);
  const selectedService = services.find((s) => s.id.toString() === selectedServiceId);

  const ownerDisplayLabel =
    selectedOwnerId === "all"
      ? "Owner: All"
      : selectedOwner
      ? `Owner: ${selectedOwner.name}`
      : "Owner: All";

  const serviceDisplayLabel =
    selectedServiceId === "all"
      ? "Service: All"
      : selectedService
      ? `Service: ${selectedService.name}`
      : "Service: All";

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 sm:p-4 space-y-3 shadow-xs">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search input with clean clear button */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers by name, company, phone, email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Origin Quick Filter Pills */}
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => onOriginChange("all")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                selectedOrigin === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onOriginChange("direct")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                selectedOrigin === "direct"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              Direct
            </button>
            <button
              type="button"
              onClick={() => onOriginChange("converted")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                selectedOrigin === "converted"
                  ? "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LinkIcon className="h-3 w-3" />
              From Lead
            </button>
          </div>

          {/* Status Dropdown */}
          <div className="w-36">
            <Select
              value={selectedStatus}
              onValueChange={(val) => onStatusChange(val || "all")}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status: All">
                  {selectedStatus === "all"
                    ? "Status: All"
                    : selectedStatus === "active"
                    ? "Status: Active"
                    : "Status: Inactive"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status: All</SelectItem>
                <SelectItem value="active">Active Accounts</SelectItem>
                <SelectItem value="inactive">Inactive / Archived</SelectItem>
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
                      if (onServiceChange) onServiceChange("all");
                      onOwnerChange("all");
                      onDateRangeChange({ dateFrom: undefined, dateTo: undefined });
                    }}
                    className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-1.5"
                  >
                    Reset
                  </Button>
                )}
              </div>

              {/* Created Date Filter */}
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

              {/* Service Subscription Filter */}
              {services.length > 0 && onServiceChange && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Active Service Subscription
                  </label>
                  <Select
                    value={selectedServiceId}
                    onValueChange={(val) => onServiceChange(val || "all")}
                  >
                    <SelectTrigger className="h-9 text-xs w-full">
                      <SelectValue placeholder="Service: All">
                        {serviceDisplayLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      {services.map((svc) => (
                        <SelectItem key={svc.id} value={svc.id.toString()}>
                          {svc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Owner Filter */}
              {owners.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Assigned Account Manager
                  </label>
                  <Select
                    value={selectedOwnerId}
                    onValueChange={(val) => onOwnerChange(val || "all")}
                  >
                    <SelectTrigger className="h-9 text-xs w-full">
                      <SelectValue placeholder="Owner: All">
                        {ownerDisplayLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Owner: All Team</SelectItem>
                      {owners.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>
                          {owner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Reset Filters Action */}
          {hasAnyActiveFilter && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-9 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
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
