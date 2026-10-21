"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Eye,
  Edit2,
  CheckCircle2,
  XCircle,
  Send,
  ArrowRight,
  MoreHorizontal,
  Clock,
  Printer,
  FileCheck,
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
import type { QuotationItem, QuotationStatus } from "../types/quotation.types";

interface QuotationTableProps {
  items: QuotationItem[];
  isLoading: boolean;
  onView: (quote: QuotationItem) => void;
  onEdit?: (quote: QuotationItem) => void;
  onStatusChange?: (quote: QuotationItem, status: QuotationStatus) => void;
  onConvertToInvoice?: (quote: QuotationItem) => void;
  onPrintPreview?: (quote: QuotationItem) => void;
}

export function QuotationTable({
  items,
  isLoading,
  onView,
  onEdit,
  onStatusChange,
  onConvertToInvoice,
  onPrintPreview,
}: QuotationTableProps) {
  const getStatusBadge = (quote: QuotationItem) => {
    const isPast = quote.validUntil < Date.now();
    if (quote.status === "sent" && isPast) {
      return (
        <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10">
          <Clock className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }

    switch (quote.status) {
      case "draft":
        return (
          <Badge variant="secondary" className="font-normal text-muted-foreground">
            Draft
          </Badge>
        );
      case "sent":
        return (
          <Badge className="bg-blue-600 text-white font-medium hover:bg-blue-700">
            <Send className="h-2.5 w-2.5 mr-1" />
            Sent
          </Badge>
        );
      case "viewed":
        return (
          <Badge className="bg-sky-500 text-white font-medium hover:bg-sky-600">
            <Eye className="h-2.5 w-2.5 mr-1" />
            Viewed
          </Badge>
        );
      case "accepted":
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-emerald-600 text-white font-medium hover:bg-emerald-700">
              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
              Accepted
            </Badge>
            {quote.invoiceNumber && (
              <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 font-mono text-[10px]">
                Invoiced: {quote.invoiceNumber}
              </Badge>
            )}
          </div>
        );
      case "declined":
        return (
          <Badge variant="destructive" className="font-medium">
            <XCircle className="h-2.5 w-2.5 mr-1" />
            Declined
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10">
            <Clock className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary animate-pulse mb-3">
          <FileText className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium text-foreground">Loading commercial proposals...</p>
        <p className="text-xs text-muted-foreground mt-0.5">Fetching latest quotes and pricing records</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
        <FileCheck className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground">No Quotations Found</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
          No proposals match the current filter criteria. Create a new quotation to issue a customized proposal to a lead or customer.
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
              <th className="py-3 px-4">Quote Number</th>
              <th className="py-3 px-4">Client / Prospect</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Valid Until</th>
              <th className="py-3 px-4 text-right">Grand Total</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {items.map((quote) => {
              const clientName = quote.lead?.name || quote.customer?.name || "Unknown";
              const clientCompany = quote.lead?.company || quote.customer?.company;
              const clientHref = quote.leadId
                ? `/sales/leads/${quote.leadId}`
                : quote.customerId
                ? `/customers/customers/${quote.customerId}`
                : "#";

              return (
                <tr
                  key={quote.id}
                  className="hover:bg-muted/30 transition-colors group cursor-pointer"
                  onClick={() => onView(quote)}
                >
                  {/* Quote Number */}
                  <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{quote.quoteNumber}</span>
                    </div>
                  </td>

                  {/* Client / Prospect */}
                  <td className="py-3.5 px-4">
                    <Link
                      href={clientHref}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-foreground hover:text-primary transition-colors hover:underline block truncate max-w-[200px]"
                    >
                      {clientName}
                    </Link>
                    {clientCompany && (
                      <span className="text-[11px] text-muted-foreground block truncate max-w-[200px]">
                        {clientCompany}
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(quote)}
                  </td>

                  {/* Valid Until */}
                  <td className="py-3.5 px-4 text-muted-foreground">
                    {formatFinancialDate(quote.validUntil)}
                  </td>

                  {/* Grand Total */}
                  <td className="py-3.5 px-4 text-right font-semibold text-foreground text-sm">
                    {formatINR(quote.total)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuItem onClick={() => onView(quote)}>
                          <Eye className="h-3.5 w-3.5 mr-2" />
                          View Proposal
                        </DropdownMenuItem>

                        {onPrintPreview && (
                          <DropdownMenuItem onClick={() => onPrintPreview(quote)}>
                            <Printer className="h-3.5 w-3.5 mr-2" />
                            Print / PDF Preview
                          </DropdownMenuItem>
                        )}

                        {quote.status === "draft" && onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(quote)}>
                            <Edit2 className="h-3.5 w-3.5 mr-2" />
                            Edit Draft
                          </DropdownMenuItem>
                        )}

                        {quote.status === "accepted" && (
                          <>
                            <DropdownMenuSeparator />
                            {quote.invoiceNumber ? (
                              <DropdownMenuItem
                                onClick={() => onView(quote)}
                                className="text-primary font-medium"
                              >
                                <FileText className="h-3.5 w-3.5 mr-2" />
                                View Tax Invoice
                              </DropdownMenuItem>
                            ) : onConvertToInvoice ? (
                              <DropdownMenuItem
                                onClick={() => onConvertToInvoice(quote)}
                                className="text-primary font-medium"
                              >
                                <ArrowRight className="h-3.5 w-3.5 mr-2" />
                                Convert to Invoice
                              </DropdownMenuItem>
                            ) : null}
                          </>
                        )}

                        {onStatusChange && quote.status !== "accepted" && (
                          <>
                            <DropdownMenuSeparator />
                            {quote.status === "draft" && (
                              <DropdownMenuItem
                                onClick={() => onStatusChange(quote, "sent")}
                              >
                                <Send className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                Mark as Sent
                              </DropdownMenuItem>
                            )}

                            {(quote.status === "sent" || quote.status === "viewed") && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => onStatusChange(quote, "accepted")}
                                  className="text-emerald-600"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                                  Mark as Accepted
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onStatusChange(quote, "declined")}
                                  className="text-red-600"
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-2" />
                                  Mark as Declined
                                </DropdownMenuItem>
                              </>
                            )}
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
