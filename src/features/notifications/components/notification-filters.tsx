"use client";

import * as React from "react";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { NotificationCategory } from "../types";

export interface NotificationFilterState {
  readStatus: "all" | "unread" | "read";
  category: NotificationCategory | "all";
  search: string;
}

interface NotificationFiltersProps {
  filter: NotificationFilterState;
  onFilterChange: (next: NotificationFilterState) => void;
  unreadCount?: number;
  totalCount?: number;
}

const CATEGORIES: { label: string; value: NotificationCategory | "all" }[] = [
  { label: "All Categories", value: "all" },
  { label: "Leads", value: "leads" },
  { label: "Appointments", value: "appointments" },
  { label: "Tasks", value: "tasks" },
  { label: "Financials", value: "financials" },
  { label: "Customers", value: "customers" },
  { label: "System", value: "system" },
];

/**
 * Functional filter toolbar for the notification center inbox
 */
export function NotificationFilters({
  filter,
  onFilterChange,
  unreadCount = 0,
  totalCount,
}: NotificationFiltersProps) {
  const handleReadStatus = (status: "all" | "unread" | "read") => {
    onFilterChange({ ...filter, readStatus: status });
  };

  const handleCategory = (category: NotificationCategory | "all") => {
    onFilterChange({ ...filter, category });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filter, search: e.target.value });
  };

  const clearSearch = () => {
    onFilterChange({ ...filter, search: "" });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-card p-3 shadow-2xs">
      {/* Top Row: Search and Read/Unread toggles */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search alerts by title or message..."
            value={filter.search}
            onChange={handleSearch}
            className="pl-8 pr-8 h-9 text-xs"
          />
          {filter.search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Read Status Segmented Buttons */}
        <div className="flex items-center rounded-lg border border-border/80 p-0.5 bg-muted/30 self-start sm:self-auto">
          <Button
            type="button"
            variant={filter.readStatus === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleReadStatus("all")}
            className="h-7 px-3 text-xs font-medium"
          >
            All {totalCount !== undefined ? `(${totalCount})` : ""}
          </Button>
          <Button
            type="button"
            variant={filter.readStatus === "unread" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleReadStatus("unread")}
            className="h-7 px-3 text-xs font-medium text-primary"
          >
            Unread {unreadCount > 0 ? `(${unreadCount})` : ""}
          </Button>
          <Button
            type="button"
            variant={filter.readStatus === "read" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleReadStatus("read")}
            className="h-7 px-3 text-xs font-medium text-muted-foreground"
          >
            Read
          </Button>
        </div>
      </div>

      {/* Bottom Row: Category Pill Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground pr-1 shrink-0">
          <Filter className="h-3.5 w-3.5" /> Filter:
        </span>
        {CATEGORIES.map((cat) => {
          const isActive = filter.category === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => handleCategory(cat.value)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                  : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted border-border/70"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
