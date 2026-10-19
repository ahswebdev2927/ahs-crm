"use client";

import * as React from "react";
import { Loader2, AlertCircle, CreditCard, Receipt, UploadCloud } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/formatters";
import type { InvoiceDetail, InvoiceItem } from "@/features/invoices/types/invoice.types";
import { PAYMENT_METHODS, type PaymentMethod } from "../schemas/payment.schema";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceDetail | InvoiceItem | null;
  onSuccess: () => void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: RecordPaymentDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Form State
  const [amountRupees, setAmountRupees] = React.useState<number>(0);
  const [paymentDate, setPaymentDate] = React.useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("bank_transfer");
  const [transactionReference, setTransactionReference] = React.useState<string>("");
  const [receiptUrl, setReceiptUrl] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");

  // Populate default remaining balance when modal opens
  React.useEffect(() => {
    if (!open || !invoice) return;

    const remainingDueRupees = Math.max(0, Math.round(invoice.amountDue / 100));
    setAmountRupees(remainingDueRupees);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("bank_transfer");
    setTransactionReference("");
    setReceiptUrl("");
    setNotes("");
    setErrorMsg(null);
  }, [open, invoice]);

  if (!invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amountInPaise = Math.round(Number(amountRupees || 0) * 100);

    if (amountInPaise <= 0) {
      setErrorMsg("Payment amount must be greater than zero.");
      return;
    }

    if (amountInPaise > invoice.amountDue) {
      setErrorMsg(
        `Payment amount (${formatINR(amountInPaise)}) exceeds remaining balance due (${formatINR(
          invoice.amountDue
        )}).`
      );
      return;
    }

    setSubmitting(true);

    try {
      const parsedDate = new Date(paymentDate).getTime();

      const payload = {
        invoiceId: invoice.id,
        amount: amountInPaise,
        paymentDate: isNaN(parsedDate) ? Date.now() : parsedDate,
        paymentMethod,
        transactionReference: transactionReference.trim() || null,
        receiptUrl: receiptUrl.trim() || null,
        notes: notes.trim() || null,
      };

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to record payment transaction.");
      }

      onSuccess();
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-stone-900">
            <CreditCard className="w-5 h-5 text-emerald-700" />
            Record Payment Receipt
          </DialogTitle>
          <DialogDescription className="text-stone-500 text-xs">
            Log a partial or full payment transaction against invoice{" "}
            <span className="font-mono font-semibold text-stone-800">
              {invoice.invoiceNumber}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Invoice Summary Banner */}
        <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-stone-500">Invoice Total:</span>
            <span className="font-mono font-medium text-stone-800">
              {formatINR(invoice.total)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Already Paid:</span>
            <span className="font-mono text-emerald-700">
              {formatINR(invoice.amountPaid)}
            </span>
          </div>
          <div className="flex justify-between pt-1 border-t border-stone-200 font-bold">
            <span className="text-stone-700">Outstanding Balance:</span>
            <span className="font-mono text-rose-600">{formatINR(invoice.amountDue)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Amount (₹) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-stone-700">
                Payment Amount (₹) *
              </label>
              <button
                type="button"
                onClick={() => setAmountRupees(Math.round(invoice.amountDue / 100))}
                className="text-[11px] text-emerald-700 hover:underline font-medium"
              >
                Pay Full Balance
              </button>
            </div>
            <Input
              type="number"
              min="1"
              step="any"
              value={amountRupees}
              onChange={(e) => setAmountRupees(parseFloat(e.target.value) || 0)}
              required
              className="bg-white font-mono text-sm font-semibold"
            />
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700">
                Payment Method *
              </label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
              >
                <SelectTrigger className="bg-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                  <SelectItem value="upi">UPI (GPay, PhonePe, etc.)</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card (Credit/Debit)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700">Payment Date *</label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="bg-white text-xs h-9"
              />
            </div>
          </div>

          {/* Reference / UTR Number */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700">
              Transaction Ref / UTR / Cheque No.
            </label>
            <Input
              placeholder="e.g. UPI Ref / Bank UTR / Cheque #123456"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              className="bg-white text-xs h-9 font-mono"
            />
          </div>

          {/* Receipt Proof Attachment (URL) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> Receipt / Proof Document URL
            </label>
            <Input
              type="url"
              placeholder="https://... (Cloudinary / Google Drive link)"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              className="bg-white text-xs h-9"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700">Payment Remarks</label>
            <Textarea
              placeholder="Optional notes or remarks regarding this receipt..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-white text-xs"
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs min-w-[110px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Recording...
                </>
              ) : (
                "Save Payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
