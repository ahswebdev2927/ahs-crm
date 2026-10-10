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
  Search,
  X,
  Filter,
  Sparkles,
  Link as LinkIcon,
  RotateCcw,
} from "lucide-react";
import type { UserSummary } from "../types/customer.types";

interface CustomerFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedOrigin: string;
  onOriginChange: (value: string) => void;
  selectedOwnerId: string;
  onOwnerChange: (value: string) => void;
  owners: UserSummary[];
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
  owners,
  onReset,
}: CustomerFiltersProps) {
  const hasActiveFilters =
    search.trim() !== "" ||
    selectedStatus !== "all" ||
    selectedOrigin !== "all" ||
    selectedOwnerId !== "all";

  const selectedOwner = owners.find((u) => u.id === selectedOwnerId);

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 sm:p-4 space-y-3 shadow-xs">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search input with debounced clean appearance */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers by name, company, phone, email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-background"
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

          {/* Owner Dropdown */}
          <div className="w-44">
            <Select
              value={selectedOwnerId}
              onValueChange={(val) => onOwnerChange(val || "all")}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Owner: All">
                  {selectedOwnerId === "all"
                    ? "Owner: All"
                    : `Owner: ${selectedOwner?.name || "Selected"}`}
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

          {/* Reset Filters Action */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-9 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
