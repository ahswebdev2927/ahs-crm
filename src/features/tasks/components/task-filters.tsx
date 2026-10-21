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
import { Search, LayoutList, Kanban, RotateCcw, User, Clock } from "lucide-react";
import type { TaskFilterValues, UserSummary } from "../types/task.types";

interface TaskFiltersProps {
  filters: TaskFilterValues;
  onFilterChange: (filters: TaskFilterValues) => void;
  onReset: () => void;
  teamUsers?: UserSummary[];
}

export function TaskFilters({
  filters,
  onFilterChange,
  onReset,
  teamUsers = [],
}: TaskFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handleStatusChange = (val: string) => {
    onFilterChange({ ...filters, status: val });
  };

  const handlePriorityChange = (val: string) => {
    onFilterChange({ ...filters, priority: val });
  };

  const handleAssigneeChange = (val: string) => {
    onFilterChange({ ...filters, assignedToId: val });
  };

  const handlePresetChange = (preset: "all" | "today" | "week" | "overdue") => {
    onFilterChange({ ...filters, dueDatePreset: preset });
  };

  const handleViewModeToggle = (mode: "list" | "kanban") => {
    onFilterChange({ ...filters, viewMode: mode });
  };

  const hasActiveFilters =
    Boolean(filters.search) ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.assignedToId !== "all" ||
    filters.dueDatePreset !== "all";

  return (
    <div className="space-y-3 mb-6">
      {/* Top row: Search, Filter dropdowns, and View toggle */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks by title, lead, customer..."
              value={filters.search}
              onChange={handleSearchChange}
              className="pl-8 text-xs h-9 bg-background"
            />
          </div>

          {/* Status Select */}
          <Select
            value={filters.status}
            onValueChange={(val) => {
              if (val) handleStatusChange(val);
            }}
          >
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="deferred">Deferred</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Select */}
          <Select
            value={filters.priority}
            onValueChange={(val) => {
              if (val) handlePriorityChange(val);
            }}
          >
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Assignee Filter */}
          <Select
            value={filters.assignedToId}
            onValueChange={(val) => {
              if (val) handleAssigneeChange(val);
            }}
          >
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Assignee" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="me">Assigned to Me</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teamUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {/* View Mode Toggle: List vs Kanban */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 shrink-0 self-end sm:self-auto">
          <Button
            variant={filters.viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleViewModeToggle("list")}
            className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer shadow-2xs"
          >
            <LayoutList className="h-3.5 w-3.5" />
            <span>List</span>
          </Button>
          <Button
            variant={filters.viewMode === "kanban" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleViewModeToggle("kanban")}
            className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer shadow-2xs"
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Kanban</span>
          </Button>
        </div>
      </div>

      {/* Bottom row: Due Date Presets */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
        <span className="text-muted-foreground flex items-center gap-1 mr-1 text-[11px] font-medium">
          <Clock className="h-3 w-3" /> Due Date:
        </span>
        {(
          [
            { label: "All Tasks", value: "all" },
            { label: "Due Today", value: "today" },
            { label: "Due This Week", value: "week" },
            { label: "Overdue", value: "overdue" },
          ] as const
        ).map((preset) => {
          const isActive = filters.dueDatePreset === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => handlePresetChange(preset.value)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                isActive
                  ? preset.value === "overdue"
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold border border-rose-300 dark:border-rose-800"
                    : "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
