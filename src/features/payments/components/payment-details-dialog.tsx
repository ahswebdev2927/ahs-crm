"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  CreditCard,
  Building,
  Calendar,
  FileText,
  User,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatINR, formatFinancialDate } from "@/lib/formatters";
import type { PaymentItem } from "../types/payment.types";

interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentItem | null;
  onViewInvoice?: (invoiceId: string) => void;
  onSuccess?: () => void;
}

export function PaymentDetailsDialog({
  open,
  onOpenChange,
  payment,
  onViewInvoice,
  onSuccess,
}: PaymentDetailsDialogProps) {
  const [isRefunding, setIsRefunding] = React.useState(false);
  const [refundReason, setRefundReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setIsRefunding(false);
      setRefundReason("");
      setSubmitting(false);
    }
  }, [open]);

  if (!payment) return null;

  const handleRefund = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/payments/${payment.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "refunded",
          reason: refundReason.trim() || "Reversed by authorized user",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.add({
          type: "success",
          title: "Payment Reversed",
          description: "Payment has been marked as refunded and invoice balance has been adjusted.",
        });
        setIsRefunding(false);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.add({
          type: "error",
          title: "Reversal Failed",
          description: data.message || "Unable to reverse payment transaction.",
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Connection Error",
        description: "Failed to communicate with payment service.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" /> Completed
          </Badge>
        );
      case "refunded":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
            <RotateCcw className="w-3 h-3 mr-1" /> Refunded / Reversed
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-xs">
            <AlertCircle className="w-3 h-3 mr-1" /> Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" /> {status}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Payment Details
            </DialogTitle>
            {getStatusBadge(payment.status)}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Transaction ID: <span className="font-mono text-foreground">{payment.id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Amount Card */}
          <div className="bg-muted/50 p-3.5 rounded-lg border border-border/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Amount Received
              </div>
              <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                {formatINR(payment.amount)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground">Payment Method</div>
              <Badge variant="outline" className="mt-0.5 capitalize font-medium">
                {payment.paymentMethod.replace("_", " ")}
              </Badge>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Payment Date
              </div>
              <div className="font-medium text-foreground">
                {formatFinancialDate(payment.paymentDate)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Logged By
              </div>
              <div className="font-medium text-foreground truncate">
                {payment.receivedByName || "Staff"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <FileText className="w-3 h-3" /> Invoice Reference
              </div>
              {payment.invoice ? (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onViewInvoice?.(payment.invoiceId);
                  }}
                  className="font-mono font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  {payment.invoice.invoiceNumber}
                </button>
              ) : (
                <span className="text-muted-foreground font-mono">Invoice #{payment.invoiceId.slice(0, 8)}</span>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Building className="w-3 h-3" /> Customer
              </div>
              <div className="font-medium text-foreground truncate">
                {payment.customer?.name || "Customer Record"}
              </div>
            </div>
          </div>

          {/* UTR / Reference */}
          <div className="p-2.5 rounded bg-background border border-border space-y-1">
            <div className="text-[11px] text-muted-foreground">Transaction Reference / UTR Number</div>
            <div className="font-mono text-xs font-semibold text-foreground break-all">
              {payment.transactionReference || "None recorded"}
            </div>
          </div>

          {/* Notes / Remarks */}
          {payment.notes && (
            <div className="p-2.5 rounded bg-background border border-border space-y-1">
              <div className="text-[11px] text-muted-foreground">Notes & Remarks</div>
              <div className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                {payment.notes}
              </div>
            </div>
          )}

          {/* Reversal Confirmation Section */}
          {isRefunding && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2.5">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4" />
                Confirm Payment Reversal / Refund
              </div>
              <p className="text-[11px] text-muted-foreground">
                This will mark the receipt as refunded and restore the balance of{" "}
                <strong className="text-foreground">{formatINR(payment.amount)}</strong> back to the invoice.
              </p>
              <Input
                placeholder="Reason for reversal (e.g. cheque bounce, duplicate entry)"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="h-8 text-xs bg-background"
                disabled={submitting}
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRefunding(false)}
                  disabled={submitting}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRefund}
                  disabled={submitting}
                  className="h-7 text-xs"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  )}
                  Confirm Reversal
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-3 flex flex-row items-center justify-between sm:justify-between">
          <div>
            {payment.status === "completed" && !isRefunding && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRefunding(true)}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 h-8"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reverse / Refund
              </Button>
            )}
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
