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
import { Search, LayoutList, Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import type { FieldSalesUser } from "../types/appointment.types";

export type CalendarSubView = "month" | "week" | "day" | "agenda";
export type MainViewMode = "list" | "calendar";

interface AppointmentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  assignedToId: string;
  onAssignedToChange: (value: string) => void;
  fieldSalesUsers: FieldSalesUser[];
  mainView: MainViewMode;
  onMainViewChange: (view: MainViewMode) => void;
  calendarSubView: CalendarSubView;
  onCalendarSubViewChange: (subView: CalendarSubView) => void;
  onReset: () => void;
}

export function AppointmentFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  assignedToId,
  onAssignedToChange,
  fieldSalesUsers,
  mainView,
  onMainViewChange,
  calendarSubView,
  onCalendarSubViewChange,
  onReset,
}: AppointmentFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between mb-5 bg-card p-3 rounded-lg border border-border/80 dark:border-input/10 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-center gap-2 flex-1">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title, client, or site..."
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
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rescheduled">Rescheduled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>

        {/* Field Sales Rep Filter */}
        <Select value={assignedToId} onValueChange={(val) => onAssignedToChange(val || "all")}>
          <SelectTrigger className="w-full sm:w-48 text-xs h-9">
            <SelectValue placeholder="All Field Reps" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Field Reps</SelectItem>
            {fieldSalesUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || (status && status !== "all") || (assignedToId && assignedToId !== "all")) && (
          <Button variant="ghost" size="sm" onClick={onReset} className="h-9 text-xs text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* View Mode & Calendar Sub-View Switchers */}
      <div className="flex items-center gap-2 self-end lg:self-auto">
        {mainView === "calendar" && (
          <div className="inline-flex rounded-md shadow-2xs bg-muted/60 p-0.5 border border-border/50">
            <button
              type="button"
              onClick={() => onCalendarSubViewChange("month")}
              className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all ${
                calendarSubView === "month"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => onCalendarSubViewChange("week")}
              className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all ${
                calendarSubView === "week"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => onCalendarSubViewChange("day")}
              className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all ${
                calendarSubView === "day"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => onCalendarSubViewChange("agenda")}
              className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all ${
                calendarSubView === "agenda"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Agenda
            </button>
          </div>
        )}

        <div className="inline-flex rounded-md shadow-2xs bg-muted/60 p-0.5 border border-border/50">
          <button
            type="button"
            onClick={() => onMainViewChange("list")}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-sm transition-all ${
              mainView === "list"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => onMainViewChange("calendar")}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-sm transition-all ${
              mainView === "calendar"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>Calendar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
