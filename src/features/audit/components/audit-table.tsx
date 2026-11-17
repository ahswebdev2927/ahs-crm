"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldAlert,
  User,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import type { AuditLogRecord } from "../schemas/audit.schema";

interface AuditTableProps {
  items: AuditLogRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onSelectEntry: (entry: AuditLogRecord) => void;
  onResetFilters?: () => void;
}

/**
 * Returns color-coded badge classes based on action type.
 */
function getActionBadgeStyle(action: string): string {
  const lower = action.toLowerCase();

  if (lower.includes("created") || lower.includes("added")) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  }
  if (lower.includes("transferred") || lower.includes("assigned") || lower.includes("stage")) {
    return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30";
  }
  if (lower.includes("updated") || lower.includes("changed") || lower.includes("status")) {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
  }
  if (lower.includes("removed") || lower.includes("deactivated") || lower.includes("void") || lower.includes("cancelled") || lower.includes("archived")) {
    return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
  }
  if (lower.includes("received") || lower.includes("paid")) {
    return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30";
  }

  return "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/30";
}

export function AuditTable({
  items,
  total,
  page,
  limit,
  totalPages,
  loading,
  onPageChange,
  onLimitChange,
  onSelectEntry,
  onResetFilters,
}: AuditTableProps) {
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  if (loading) {
    return (
      <div className="w-full rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-8 space-y-4">
          <div className="h-4 bg-muted/60 rounded-md w-1/4 animate-pulse" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="w-full rounded-xl border border-dashed border-border bg-card/60 p-12 text-center shadow-xs">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted/50 mb-3 text-muted-foreground">
          <ShieldAlert className="size-6" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">No audit entries found</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          No records match the active filter criteria. Try adjusting the date range, entity type, or keyword search.
        </p>
        {onResetFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="mt-4 text-xs"
          >
            Reset Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto no-scrollbar">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border text-[11px] uppercase tracking-wider select-none">
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[160px]">Action</TableHead>
              <TableHead className="w-[150px]">Entity</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead className="w-[140px]">Client / IP</TableHead>
              <TableHead className="w-[100px] text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((entry) => {
              const dateObj = new Date(entry.createdAt);
              const formattedDate = format(dateObj, "dd MMM yyyy, hh:mm a");
              const relativeTime = formatDistanceToNow(dateObj, { addSuffix: true });

              return (
                <TableRow
                  key={entry.id}
                  className="hover:bg-muted/30 transition-colors border-b border-border/50 text-xs"
                >
                  {/* Timestamp */}
                  <TableCell className="font-medium text-foreground py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs leading-snug">{formattedDate}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{relativeTime}</span>
                    </div>
                  </TableCell>

                  {/* Action Badge */}
                  <TableCell className="py-3">
                    <span
                      className={`inline-flex items-center font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getActionBadgeStyle(
                        entry.action
                      )}`}
                    >
                      {entry.action}
                    </span>
                  </TableCell>

                  {/* Entity */}
                  <TableCell className="py-3">
                    {entry.entityType ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="capitalize font-semibold text-foreground text-xs">
                          {entry.entityType}
                        </span>
                        {entry.entityId && (
                          <span
                            className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                            title={entry.entityId}
                          >
                            #{entry.entityId.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>

                  {/* Actor */}
                  <TableCell className="py-3">
                    {entry.user ? (
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                          {entry.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-foreground truncate text-xs">
                            {entry.user.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {entry.user.email}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">System / Server</span>
                    )}
                  </TableCell>

                  {/* Client IP & User Agent */}
                  <TableCell className="py-3">
                    <div className="flex flex-col min-w-0">
                      <span className="font-mono text-[11px] text-foreground">
                        {entry.ipAddress || "127.0.0.1"}
                      </span>
                      {entry.userAgent && (
                        <span
                          className="text-[10px] text-muted-foreground truncate max-w-[130px]"
                          title={entry.userAgent}
                        >
                          {entry.userAgent}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Inspect Details */}
                  <TableCell className="py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectEntry(entry)}
                      className="h-7 text-xs px-2 gap-1 text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <Eye className="size-3.5" />
                      <span>Diff</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-border bg-muted/20 text-xs">
        <div className="flex items-center gap-3 text-muted-foreground select-none">
          <span>
            Showing <strong className="text-foreground">{startItem}</strong>–
            <strong className="text-foreground">{endItem}</strong> of{" "}
            <strong className="text-foreground">{total}</strong> entries
          </span>

          <div className="flex items-center gap-1.5 ml-2">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="h-7 px-2 text-xs rounded-md border border-input bg-background font-medium focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-7 text-xs px-2 gap-1"
          >
            <ChevronLeft className="size-3.5" />
            <span>Previous</span>
          </Button>

          <span className="text-xs px-2 font-medium">
            Page {page} of {totalPages || 1}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-7 text-xs px-2 gap-1"
          >
            <span>Next</span>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
