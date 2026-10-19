"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentMethod } from "../schemas/payment.schema";

interface PaymentFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  method: string;
  onMethodChange: (method: string) => void;
  onReset: () => void;
}

export function PaymentFilters({
  search,
  onSearchChange,
  method,
  onMethodChange,
  onReset,
}: PaymentFiltersProps) {
  const hasActiveFilters = Boolean(search || (method && method !== "all"));

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-stone-200">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Search reference, UTR, customer, invoice..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-xs bg-stone-50 border-stone-200 focus-visible:bg-white"
          />
        </div>

        <Select value={method} onValueChange={(val) => { if (val) onMethodChange(val); }}>
          <SelectTrigger className="w-[180px] h-9 text-xs bg-stone-50 border-stone-200">
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

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-xs text-stone-500 hover:text-stone-900 h-9 px-2.5"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Reset Filters
        </Button>
      )}
    </div>
  );
}
