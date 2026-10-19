"use client";

import * as React from "react";
import Link from "next/link";
import {
  Receipt,
  Eye,
  Wallet,
  Printer,
  Ban,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatINR, formatFinancialDate } from "@/lib/formatters";
import type { InvoiceItem, InvoiceStatus } from "../types/invoice.types";

interface InvoiceTableProps {
  items?: InvoiceItem[];
  invoices?: InvoiceItem[];
  isLoading?: boolean;
  loading?: boolean;
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onView?: (invoice: InvoiceItem) => void;
  onViewDetails?: (invoice: InvoiceItem) => void;
  onEdit?: (invoice: InvoiceItem) => void;
  onRecordPayment?: (invoice: InvoiceItem) => void;
  onPrintPreview?: (invoice: InvoiceItem) => void;
  onStatusChange?: (invoice: InvoiceItem, status: InvoiceStatus) => void;
}

export function InvoiceTable({
  items,
  invoices,
  isLoading,
  loading,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  onView,
  onViewDetails,
  onEdit,
  onRecordPayment,
  onPrintPreview,
  onStatusChange,
}: InvoiceTableProps) {
  const invoiceList = items || invoices || [];
  const isTableLoading = isLoading ?? loading ?? false;
  const handleView = onView || onViewDetails || (() => {});
  const getStatusBadge = (invoice: InvoiceItem) => {
    if (invoice.isOverdue && invoice.status !== "paid" && invoice.status !== "cancelled") {
      return (
        <Badge variant="destructive" className="font-semibold bg-red-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      );
    }

    switch (invoice.status) {
      case "paid":
        return (
          <Badge className="bg-emerald-600 text-white font-medium hover:bg-emerald-700">
            <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
            Paid
          </Badge>
        );
      case "partially_paid":
        return (
          <Badge className="bg-blue-600 text-white font-medium hover:bg-blue-700">
            <Wallet className="h-2.5 w-2.5 mr-1" />
            Partially Paid
          </Badge>
        );
      case "unpaid":
        return (
          <Badge className="bg-amber-500 text-white font-medium hover:bg-amber-600">
            <Clock className="h-2.5 w-2.5 mr-1" />
            Unpaid
          </Badge>
        );
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "cancelled":
      case "void":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            {invoice.status.toUpperCase()}
          </Badge>
        );
      default:
        return <Badge variant="outline">{invoice.status}</Badge>;
    }
  };

  if (isTableLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary animate-pulse mb-3">
          <Receipt className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium text-foreground">Loading accounts billing ledger...</p>
        <p className="text-xs text-muted-foreground mt-0.5">Fetching client invoices and payment records</p>
      </div>
    );
  }

  if (invoiceList.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
        <Receipt className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground">No Invoices Found</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
          No billing records match the current filter selection. Convert an accepted proposal or issue a direct invoice.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Invoice Number</th>
              <th className="py-3 px-4">Customer Account</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4 text-right">Total</th>
              <th className="py-3 px-4">Collection Progress</th>
              <th className="py-3 px-4 text-right">Balance Due</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {invoiceList.map((inv) => {
              const customerName = inv.customer?.name || "Customer";
              const customerCompany = inv.customer?.company;
              const customerHref = `/customers/customers/${inv.customerId}`;
              const percentPaid = inv.total > 0 ? Math.min(100, Math.round((inv.amountPaid / inv.total) * 100)) : 0;

              return (
                <tr
                  key={inv.id}
                  className="hover:bg-muted/30 transition-colors group cursor-pointer"
                  onClick={() => handleView(inv)}
                >
                  {/* Invoice Number */}
                  <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{inv.invoiceNumber}</span>
                    </div>
                    {inv.quotationNumber && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <FileText className="h-2.5 w-2.5" />
                        From {inv.quotationNumber}
                      </span>
                    )}
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4">
                    <Link
                      href={customerHref}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-foreground hover:text-primary transition-colors hover:underline block truncate max-w-[180px]"
                    >
                      {customerName}
                    </Link>
                    {customerCompany && (
                      <span className="text-[11px] text-muted-foreground block truncate max-w-[180px]">
                        {customerCompany}
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">{getStatusBadge(inv)}</td>

                  {/* Due Date */}
                  <td className="py-3.5 px-4">
                    <span className={inv.isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                      {formatFinancialDate(inv.dueDate)}
                    </span>
                  </td>

                  {/* Total Amount */}
                  <td className="py-3.5 px-4 text-right font-semibold text-foreground text-sm font-mono">
                    {formatINR(inv.total)}
                  </td>

                  {/* Collection Progress */}
                  <td className="py-3.5 px-4 min-w-[140px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{formatINR(inv.amountPaid)}</span>
                        <span>{percentPaid}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percentPaid === 100
                              ? "bg-emerald-600"
                              : percentPaid > 0
                              ? "bg-blue-600"
                              : "bg-transparent"
                          }`}
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Balance Due */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                    {inv.amountDue > 0 ? (
                      <span className={inv.isOverdue ? "text-red-600" : "text-foreground"}>
                        {formatINR(inv.amountDue)}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">Settled</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuItem onClick={() => handleView(inv)}>
                          <Eye className="h-3.5 w-3.5 mr-2" />
                          View Invoice
                        </DropdownMenuItem>

                        {onPrintPreview && (
                          <DropdownMenuItem onClick={() => onPrintPreview(inv)}>
                            <Printer className="h-3.5 w-3.5 mr-2" />
                            Print Tax Invoice
                          </DropdownMenuItem>
                        )}

                        {inv.amountDue > 0 && onRecordPayment && inv.status !== "cancelled" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onRecordPayment(inv)}
                              className="text-primary font-semibold"
                            >
                              <Wallet className="h-3.5 w-3.5 mr-2" />
                              Record Payment
                            </DropdownMenuItem>
                          </>
                        )}

                        {inv.amountPaid === 0 &&
                          inv.status !== "cancelled" &&
                          onStatusChange && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onStatusChange(inv, "cancelled")}
                                className="text-red-600"
                              >
                                <Ban className="h-3.5 w-3.5 mr-2" />
                                Cancel Invoice
                              </DropdownMenuItem>
                            </>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
