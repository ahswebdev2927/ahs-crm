"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, LayoutList, Smartphone, RotateCcw } from "lucide-react";

export type ViewMode = "table" | "cards";

export interface FieldSalesUserOption {
  id: string;
  name: string;
  email: string;
}

interface FieldVisitFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  assignedToId: string;
  onAssignedToChange: (value: string) => void;
  fieldSalesUsers: FieldSalesUserOption[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onReset: () => void;
}

export function FieldVisitFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  assignedToId,
  onAssignedToChange,
  fieldSalesUsers,
  viewMode,
  onViewModeChange,
  onReset,
}: FieldVisitFiltersProps) {
  const isFiltered = Boolean(
    search || (status && status !== "all") || (assignedToId && assignedToId !== "all")
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-5 bg-card p-3 rounded-lg border border-border/80 dark:border-input/10 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-center gap-2 flex-1">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by purpose, client, or site..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={status} onValueChange={(val) => onStatusChange(val || "all")}>
          <SelectTrigger className="w-full sm:w-40 text-xs h-9">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Representative Filter */}
        <Select value={assignedToId} onValueChange={(val) => onAssignedToChange(val || "all")}>
          <SelectTrigger className="w-full sm:w-48 text-xs h-9">
            <SelectValue placeholder="All Field Reps" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Field Reps</SelectItem>
            {fieldSalesUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 text-xs text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Desktop / Touch Card View Toggle */}
      <div className="inline-flex rounded-md shadow-2xs bg-muted/60 p-0.5 border border-border/50 self-end sm:self-auto shrink-0">
        <button
          type="button"
          onClick={() => onViewModeChange("table")}
          className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-sm transition-all ${
            viewMode === "table"
              ? "bg-background text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutList className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Table</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("cards")}
          className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-sm transition-all ${
            viewMode === "cards"
              ? "bg-background text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span>Mobile Cards</span>
        </button>
      </div>
    </div>
  );
}
