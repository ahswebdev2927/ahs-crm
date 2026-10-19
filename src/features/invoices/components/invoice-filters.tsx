"use client";

import * as React from "react";
import { Search, RotateCcw, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InvoiceFiltersProps {
  status: string;
  onStatusChange: (status: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  overdueOnly: boolean;
  onOverdueToggle: () => void;
  onReset: () => void;
}

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "All Invoices", value: "all" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Partially Paid", value: "partially_paid" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Cancelled", value: "cancelled" },
];

export function InvoiceFilters({
  status,
  onStatusChange,
  search,
  onSearchChange,
  overdueOnly,
  onOverdueToggle,
  onReset,
}: InvoiceFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice number, client, or notes..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={overdueOnly ? "destructive" : "outline"}
            size="sm"
            onClick={onOverdueToggle}
            className={`h-9 text-xs cursor-pointer ${
              overdueOnly ? "bg-red-600 hover:bg-red-700 text-white" : ""
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
            Overdue Receivables
          </Button>

          {(search || status !== "all" || overdueOnly) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Status Segmented Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-border/60">
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.value && !overdueOnly;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onStatusChange(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
                isActive
                  ? "border-primary text-primary font-semibold bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
