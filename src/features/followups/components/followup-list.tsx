"use client";

import * as React from "react";
import { FollowUpCard } from "./followup-card";
import { Button } from "@/components/ui/button";
import { PhoneCall, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import type { FollowUpItem } from "../types/followup.types";

interface FollowUpListProps {
  items: FollowUpItem[];
  isLoading?: boolean;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onComplete?: (followUp: FollowUpItem) => void;
  onReschedule?: (followUp: FollowUpItem) => void;
  onCancel?: (followUp: FollowUpItem) => void;
  onScheduleNew?: () => void;
  showEntityLink?: boolean;
}

export function FollowUpList({
  items,
  isLoading = false,
  pagination,
  onPageChange,
  onComplete,
  onReschedule,
  onCancel,
  onScheduleNew,
  showEntityLink = true,
}: FollowUpListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-border bg-card p-5 animate-pulse space-y-3"
          >
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-xl p-8 sm:p-12 text-center bg-card">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
          <Calendar className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No Follow-ups Found</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
          There are no follow-up records matching your current filter criteria.
        </p>
        {onScheduleNew && (
          <Button size="sm" onClick={onScheduleNew}>
            <PhoneCall className="h-4 w-4 mr-1.5" />
            Schedule Follow-up
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((followUp) => (
          <FollowUpCard
            key={followUp.id}
            followUp={followUp}
            onComplete={onComplete}
            onReschedule={onReschedule}
            onCancel={onCancel}
            showEntityLink={showEntityLink}
          />
        ))}
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="h-8 text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="h-8 text-xs"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
