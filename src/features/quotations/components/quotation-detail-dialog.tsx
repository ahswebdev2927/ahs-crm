"use client";

import * as React from "react";
import {
  FileText,
  Printer,
  CheckCircle2,
  XCircle,
  Send,
  ArrowRight,
  Calendar,
  Building2,
  Mail,
  Phone,
  Clock,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatFinancialDate } from "@/lib/formatters";
import type { QuotationDetail, QuotationStatus } from "../types/quotation.types";

interface QuotationDetailDialogProps {
  quote: QuotationDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (quote: QuotationDetail, status: QuotationStatus) => Promise<void>;
  onConvertToInvoice: (quote: QuotationDetail) => void;
  onPrintPreview: (quote: QuotationDetail) => void;
}

export function QuotationDetailDialog({
  quote: rawQuote,
  open,
  onOpenChange,
  onStatusChange,
  onConvertToInvoice,
  onPrintPreview,
}: QuotationDetailDialogProps) {
  const [updating, setUpdating] = React.useState(false);

  const quote = ((rawQuote as any)?.quotation || rawQuote) as QuotationDetail | null;

  if (!quote) return null;

  const handleStatusTransition = async (newStatus: QuotationStatus) => {
    setUpdating(true);
    try {
      await onStatusChange(quote, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  const clientName = quote.customer?.name || quote.lead?.name || "Client";
  const clientCompany = quote.customer?.company || quote.lead?.company;
  const clientEmail = quote.customer?.email || quote.lead?.email;
  const clientPhone = quote.customer?.phone || quote.lead?.phone;
  const isPast = quote.validUntil < Date.now();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <DialogTitle className="text-base font-bold font-mono">
                  {quote.quoteNumber}
                </DialogTitle>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>Issued on {formatFinancialDate(quote.createdAt)}</span>
                  <span>•</span>
                  <span>Valid until {formatFinancialDate(quote.validUntil)}</span>
                  {isPast && quote.status === "sent" && (
                    <span className="text-amber-500 font-medium">(Expired)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                className={
                  quote.status === "accepted"
                    ? "bg-emerald-600 text-white"
                    : quote.status === "sent"
                    ? "bg-blue-600 text-white"
                    : quote.status === "declined"
                    ? "bg-red-600 text-white"
                    : "bg-muted text-muted-foreground"
                }
              >
                {quote.status.toUpperCase()}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPrintPreview(quote)}
                className="h-8 text-xs cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print / PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Client & Metadata Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/20 border border-border rounded-lg text-xs">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Prospect / Client</div>
            <div className="font-semibold text-foreground text-sm">{clientName}</div>
            {clientCompany && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span>{clientCompany}</span>
              </div>
            )}
            {clientEmail && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span>{clientEmail}</span>
              </div>
            )}
            {clientPhone && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{clientPhone}</span>
              </div>
            )}
          </div>

          <div className="space-y-1 sm:text-right flex flex-col sm:items-end justify-center">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Prepared By</div>
            <div className="font-medium text-foreground">{quote.createdBy?.name || "Company Staff"}</div>
            <div className="text-muted-foreground text-[11px]">{quote.createdBy?.email}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Account Target: {quote.customerId ? "Customer" : "Lead"}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-border rounded-lg overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Description / Deliverable</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Rate</th>
                <th className="py-2.5 px-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(quote.items || []).map((item, index) => (
                <tr key={item.id} className="hover:bg-muted/20">
                  <td className="py-2.5 px-3 text-muted-foreground">{index + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-foreground">{item.description}</td>
                  <td className="py-2.5 px-3 text-center text-muted-foreground">{item.quantity}</td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground font-mono">
                    {formatINR(item.unitPrice)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-foreground font-mono">
                    {formatINR(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Breakdown */}
        <div className="flex justify-end text-xs">
          <div className="w-full sm:w-72 space-y-1.5 p-3 bg-muted/20 border border-border rounded-lg">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span className="font-medium text-foreground">{formatINR(quote.subtotal)}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount:</span>
                <span>- {formatINR(quote.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>GST / Taxes:</span>
              <span className="font-medium text-foreground">{formatINR(quote.tax)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold text-sm text-foreground">
              <span>Grand Total:</span>
              <span className="text-primary text-base">{formatINR(quote.total)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Notes */}
        {(quote.terms || quote.notes) && (
          <div className="space-y-3 pt-2 text-xs">
            {quote.terms && (
              <div className="p-3 bg-muted/10 border border-border rounded-md">
                <div className="font-semibold text-foreground mb-1">Commercial Terms & Scope</div>
                <div className="whitespace-pre-line text-muted-foreground text-[11px] leading-relaxed">
                  {quote.terms}
                </div>
              </div>
            )}
            {quote.notes && (
              <div className="p-3 bg-muted/10 border border-border rounded-md">
                <div className="font-semibold text-foreground mb-1">Internal Notes</div>
                <div className="whitespace-pre-line text-muted-foreground text-[11px]">
                  {quote.notes}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Controls Footer */}
        <DialogFooter className="border-t border-border pt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {quote.status === "draft" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusTransition("sent")}
                disabled={updating}
                className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 cursor-pointer"
              >
                {updating ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                Mark as Sent
              </Button>
            )}

            {(quote.status === "sent" || quote.status === "viewed") && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusTransition("accepted")}
                  disabled={updating}
                  className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 cursor-pointer"
                >
                  {updating ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                  Client Accepted
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusTransition("declined")}
                  disabled={updating}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer"
                >
                  {updating ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
                  Declined
                </Button>
              </>
            )}

            {quote.status === "accepted" && (
              <Button
                size="sm"
                onClick={() => onConvertToInvoice(quote)}
                className="text-xs font-semibold bg-primary text-primary-foreground cursor-pointer"
              >
                <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                Convert to Invoice
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
