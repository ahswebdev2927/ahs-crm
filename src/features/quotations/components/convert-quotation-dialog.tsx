"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ArrowRight, Loader2, FileCheck2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/formatters";
import type { QuotationItem, QuotationDetail } from "../types/quotation.types";

interface ConvertQuotationDialogProps {
  quote: QuotationItem | QuotationDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (invoice: any) => void;
}

export function ConvertQuotationDialog({
  quote,
  open,
  onOpenChange,
  onSuccess,
}: ConvertQuotationDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Default due date to 15 days from now
  const defaultDueDate = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  }, []);

  const [dueDate, setDueDate] = React.useState<string>(defaultDueDate);
  const [notes, setNotes] = React.useState<string>("");
  const [terms, setTerms] = React.useState<string>("");

  React.useEffect(() => {
    if (open && quote) {
      setDueDate(defaultDueDate);
      setNotes(quote.notes || "");
      setTerms(
        quote.terms ||
          "1. Payment due within 15 calendar days from the date of invoice.\n2. Please mention the Invoice Number in all remittance notices.\n3. Standard GST statutory mandates applied."
      );
      setErrorMsg(null);
    }
  }, [open, quote, defaultDueDate]);

  if (!quote) return null;

  const clientName = quote.customer?.name || quote.lead?.name || "Unknown Client";

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate) {
      setErrorMsg("Please select an invoice due date.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const parsedDueDate = new Date(dueDate).getTime();
      const res = await fetch(`/api/quotations/${quote.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDate: isNaN(parsedDueDate) ? Date.now() + 15 * 86400000 : parsedDueDate,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to convert quotation to invoice.");
      }

      onSuccess(data.data.invoice);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-card border-border shadow-xl">
        <form onSubmit={handleConvert}>
          <DialogHeader className="p-5 pb-4 bg-muted/20 border-b border-border">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
              <FileCheck2 className="h-4 w-4" />
              <span>Convert Proposal to Invoice</span>
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">
              Issue Official Invoice for {quote.quoteNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Generates an authoritative tax invoice preserving agreed deliverables, item pricing, and taxes.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-md flex items-start gap-2.5 text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Proposal Summary Card */}
            <div className="p-3.5 bg-muted/40 border border-border rounded-lg space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Prospect / Client:</span>
                <span className="font-semibold text-foreground">{clientName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-mono text-foreground">{formatINR(quote.subtotal)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-mono">-{formatINR(quote.discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Tax / GST:</span>
                <span className="font-mono text-foreground">{formatINR(quote.tax)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between items-center text-sm font-semibold">
                <span className="text-foreground">Invoice Payable Total:</span>
                <span className="text-primary font-mono">{formatINR(quote.total)}</span>
              </div>
            </div>

            {/* Payment Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                Invoice Due Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="h-9 text-xs bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                Grace period after which this invoice is classified as overdue.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Invoice Remarks / Notes</label>
              <Input
                placeholder="Optional customer reference or billing note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 text-xs bg-background"
              />
            </div>

            {/* Payment Terms */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Terms & Conditions</label>
              <Textarea
                rows={3}
                placeholder="Remittance instructions, account numbers, or conditions..."
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="text-xs bg-background resize-none leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/20 border-t border-border flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Generating Invoice...
                </>
              ) : (
                <>
                  <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                  Generate Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
