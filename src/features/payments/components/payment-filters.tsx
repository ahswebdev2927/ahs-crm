"use client";

import * as React from "react";
import { Search, X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TableDateFilter } from "@/components/shared/table-date-filter";

export interface CustomerOption {
  id: string;
  name: string;
}

export interface PaymentFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  method: string;
  onMethodChange: (method: string) => void;
  status?: string;
  onStatusChange?: (status: string) => void;
  selectedCustomerId?: string;
  onCustomerChange?: (customerId: string) => void;
  customers?: CustomerOption[];
  invoiceNumber?: string;
  onInvoiceNumberChange?: (invoice: string) => void;
  dateFrom?: string | null;
  dateTo?: string | null;
  onDateRangeChange?: (range: { dateFrom?: string; dateTo?: string }) => void;
  onReset: () => void;
}

export function PaymentFilters({
  search,
  onSearchChange,
  method,
  onMethodChange,
  status = "all",
  onStatusChange,
  selectedCustomerId = "all",
  onCustomerChange,
  customers = [],
  invoiceNumber = "",
  onInvoiceNumberChange,
  dateFrom,
  dateTo,
  onDateRangeChange,
  onReset,
}: PaymentFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  // Count active advanced filters
  const advancedFilterCount = [
    selectedCustomerId !== "all",
    Boolean(invoiceNumber && invoiceNumber.trim() !== ""),
    Boolean(dateFrom || dateTo),
  ].filter(Boolean).length;

  const hasAnyActiveFilter =
    Boolean(search) ||
    (method && method !== "all") ||
    (status && status !== "all") ||
    advancedFilterCount > 0;

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const customerDisplayLabel =
    selectedCustomerId === "all"
      ? "Customer: All"
      : selectedCustomer
      ? `Customer: ${selectedCustomer.name}`
      : "Customer: All";

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 sm:p-4 space-y-3 shadow-xs">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reference, UTR, customer, invoice..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Method Dropdown */}
          <div className="w-36 sm:w-40">
            <Select value={method} onValueChange={(val) => { if (val) onMethodChange(val); }}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                <SelectItem value="upi">UPI (GPay/PhonePe)</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Dropdown */}
          {onStatusChange && (
            <div className="w-36 sm:w-40">
              <Select value={status} onValueChange={(val) => { if (val) onStatusChange(val); }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Status: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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
                      if (onCustomerChange) onCustomerChange("all");
                      if (onInvoiceNumberChange) onInvoiceNumberChange("");
                      if (onDateRangeChange) onDateRangeChange({ dateFrom: undefined, dateTo: undefined });
                    }}
                    className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-1.5"
                  >
                    Reset
                  </Button>
                )}
              </div>

              {/* Payment Date Filter */}
              {onDateRangeChange && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Payment Date
                  </label>
                  <div>
                    <TableDateFilter
                      label="Payment Date"
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                      onDateRangeChange={({ dateFrom: df, dateTo: dt }) =>
                        onDateRangeChange({ dateFrom: df, dateTo: dt })
                      }
                      className="w-full justify-between"
                    />
                  </div>
                </div>
              )}

              {/* Customer Filter */}
              {customers.length > 0 && onCustomerChange && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Customer Account
                  </label>
                  <Select
                    value={selectedCustomerId}
                    onValueChange={(val) => onCustomerChange(val || "all")}
                  >
                    <SelectTrigger className="h-9 text-xs w-full">
                      <SelectValue placeholder="Customer: All">
                        {customerDisplayLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Invoice Number Input */}
              {onInvoiceNumberChange && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Invoice Number
                  </label>
                  <Input
                    placeholder="e.g. INV-2026-001"
                    value={invoiceNumber}
                    onChange={(e) => onInvoiceNumberChange(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Reset Filters */}
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
