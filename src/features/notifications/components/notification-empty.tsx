"use client";

import * as React from "react";
import { CheckCheck, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationEmptyProps {
  isFiltered?: boolean;
  onResetFilters?: () => void;
  className?: string;
}

/**
 * Functional empty-state component for the notifications center
 */
export function NotificationEmpty({
  isFiltered = false,
  onResetFilters,
  className = "",
}: NotificationEmptyProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 p-8 sm:p-12 text-center ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground shadow-2xs mb-3.5">
        {isFiltered ? (
          <BellOff className="h-6 w-6 text-muted-foreground/80" />
        ) : (
          <CheckCheck className="h-6 w-6 text-emerald-500" />
        )}
      </div>

      <h3 className="text-sm font-semibold text-foreground">
        {isFiltered ? "No matching notifications" : "All caught up!"}
      </h3>

      <p className="mt-1 text-xs text-muted-foreground max-w-xs leading-relaxed">
        {isFiltered
          ? "There are no notifications matching your active search query or category filters."
          : "You have reviewed all recent alerts, lead assignments, and system reminders."}
      </p>

      {isFiltered && onResetFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onResetFilters}
          className="mt-4 h-8 text-xs font-medium"
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
}
