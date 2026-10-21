"use client";

import * as React from "react";
import {
  Printer,
  CreditCard,
  Building,
  Calendar,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  Ban,
  Receipt,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatFinancialDate } from "@/lib/formatters";
import type { InvoiceDetail, InvoiceStatus } from "../types/invoice.types";

interface InvoiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceDetail | null;
  onRecordPayment?: (invoice: InvoiceDetail) => void;
  onPrintPreview?: (invoice: InvoiceDetail) => void;
  onEdit?: (invoice: InvoiceDetail) => void;
  onStatusChange?: (invoiceId: string, status: InvoiceStatus) => Promise<void>;
}

export function InvoiceDetailDialog({
  open,
  onOpenChange,
  invoice: rawInvoice,
  onRecordPayment,
  onPrintPreview,
  onEdit,
  onStatusChange,
}: InvoiceDetailDialogProps) {
  const [updatingStatus, setUpdatingStatus] = React.useState(false);

  const invoice = ((rawInvoice as any)?.invoice || rawInvoice) as InvoiceDetail | null;

  if (!invoice) return null;

  const percentPaid =
    invoice.total > 0
      ? Math.min(100, Math.round((invoice.amountPaid / invoice.total) * 100))
      : 0;

  const getStatusBadge = (status: InvoiceStatus, isOverdue?: boolean) => {
    if (status === "paid") {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
          <CheckCircle className="w-3 h-3 mr-1" /> Paid
        </Badge>
      );
    }
    if (status === "partially_paid") {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
          <Clock className="w-3 h-3 mr-1" /> Partially Paid
        </Badge>
      );
    }
    if (status === "overdue" || isOverdue) {
      return (
        <Badge className="bg-rose-100 text-rose-800 border-rose-200">
          <AlertCircle className="w-3 h-3 mr-1" /> Overdue
        </Badge>
      );
    }
    if (status === "void" || status === "cancelled") {
      return (
        <Badge className="bg-stone-200 text-stone-700 border-stone-300">
          <Ban className="w-3 h-3 mr-1" /> {status.toUpperCase()}
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        <Clock className="w-3 h-3 mr-1" /> Unpaid
      </Badge>
    );
  };

  const handleUpdateStatus = async (newStatus: InvoiceStatus) => {
    if (!onStatusChange) return;
    setUpdatingStatus(true);
    try {
      await onStatusChange(invoice.id, newStatus);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl font-bold font-mono text-stone-900">
                  {invoice.invoiceNumber}
                </DialogTitle>
                {getStatusBadge(invoice.status, invoice.isOverdue)}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Issued on {formatFinancialDate(invoice.issueDate)} • Due on{" "}
                <span className={invoice.isOverdue ? "text-rose-600 font-semibold" : ""}>
                  {formatFinancialDate(invoice.dueDate)}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onPrintPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPrintPreview(invoice)}
                  className="gap-1.5 text-xs text-stone-700"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / PDF
                </Button>
              )}
              {invoice.amountDue > 0 &&
                invoice.status !== "void" &&
                invoice.status !== "cancelled" &&
                onRecordPayment && (
                  <Button
                    size="sm"
                    onClick={() => onRecordPayment(invoice)}
                    className="gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Record Payment
                  </Button>
                )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Section: Customer & Quotation Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-lg border border-stone-200">
            <div>
              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" /> Billed To
              </h4>
              <p className="font-semibold text-stone-900 text-sm">
                {invoice.customer?.name || "Customer Not Found"}
              </p>
              {invoice.customer?.company && (
                <p className="text-xs text-stone-600 font-medium">
                  {invoice.customer.company}
                </p>
              )}
              {invoice.customer?.phone && (
                <p className="text-xs text-stone-500 mt-0.5">{invoice.customer.phone}</p>
              )}
              {invoice.customer?.email && (
                <p className="text-xs text-stone-500">{invoice.customer.email}</p>
              )}
              {invoice.customer?.address && (
                <p className="text-xs text-stone-500 mt-1 whitespace-pre-line">
                  {invoice.customer.address}
                </p>
              )}
            </div>

            <div className="space-y-2 border-t md:border-t-0 md:border-l md:pl-4 pt-3 md:pt-0 border-stone-200">
              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Invoice Summary
              </h4>
              <div className="text-xs space-y-1 text-stone-600">
                {invoice.quotationNumber && (
                  <div>
                    <span className="text-stone-500">Origin Quotation:</span>{" "}
                    <span className="font-mono font-medium text-stone-800">
                      {invoice.quotationNumber}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-stone-500">Created by:</span>{" "}
                  <span className="font-medium text-stone-800">
                    {invoice.createdBy?.name || "System"}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500">Record Created:</span>{" "}
                  <span>{formatFinancialDate(invoice.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Payment Progress Bar */}
          <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-stone-700">Payment Collection Progress</span>
              <span className="font-semibold text-stone-900">{percentPaid}% Paid</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  percentPaid === 100
                    ? "bg-emerald-600"
                    : percentPaid > 0
                    ? "bg-amber-500"
                    : "bg-stone-300"
                }`}
                style={{ width: `${percentPaid}%` }}
              />
            </div>
            <div className="flex justify-between text-xs pt-1">
              <div className="text-stone-600">
                Paid: <span className="font-mono font-semibold text-emerald-700">{formatINR(invoice.amountPaid)}</span>
              </div>
              <div className="text-stone-600">
                Balance Due:{" "}
                <span
                  className={`font-mono font-semibold ${
                    invoice.amountDue > 0 ? "text-rose-600" : "text-stone-800"
                  }`}
                >
                  {formatINR(invoice.amountDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Line Items Table */}
          <div>
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Line Items
            </h4>
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
                  <tr>
                    <th className="py-2.5 px-3 text-left font-medium">#</th>
                    <th className="py-2.5 px-3 text-left font-medium">Description</th>
                    <th className="py-2.5 px-3 text-right font-medium">Qty</th>
                    <th className="py-2.5 px-3 text-right font-medium">Unit Rate</th>
                    <th className="py-2.5 px-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {(invoice.items || []).map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="py-2.5 px-3 text-stone-400 font-mono">{index + 1}</td>
                      <td className="py-2.5 px-3 text-stone-900 font-medium">
                        {item.description}
                      </td>
                      <td className="py-2.5 px-3 text-right text-stone-700">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-stone-700 font-mono">
                        {formatINR(item.unitPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-stone-900 font-semibold font-mono">
                        {formatINR(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Calculation Breakdown */}
          <div className="flex justify-end">
            <div className="w-full sm:w-80 bg-stone-50 p-4 rounded-lg border border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatINR(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount:</span>
                  <span className="font-mono">- {formatINR(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>GST Tax:</span>
                <span className="font-mono">{formatINR(invoice.tax)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-800">{formatINR(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-600 pt-1">
                <span>Amount Paid:</span>
                <span className="font-mono text-emerald-700 font-medium">
                  {formatINR(invoice.amountPaid)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-stone-200">
                <span className="text-stone-900">Remaining Balance:</span>
                <span
                  className={`font-mono ${
                    invoice.amountDue > 0 ? "text-rose-600" : "text-emerald-700"
                  }`}
                >
                  {formatINR(invoice.amountDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Payment Transactions Ledger */}
          <div>
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> Payment History (
              {invoice.payments?.length || 0})
            </h4>

            {!invoice.payments || invoice.payments.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-stone-200 rounded-lg text-xs text-stone-500">
                No payments recorded yet against this invoice.
              </div>
            ) : (
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
                    <tr>
                      <th className="py-2 px-3 text-left font-medium">Date</th>
                      <th className="py-2 px-3 text-left font-medium">Method</th>
                      <th className="py-2 px-3 text-left font-medium">Reference / UTR</th>
                      <th className="py-2 px-3 text-left font-medium">Received By</th>
                      <th className="py-2 px-3 text-right font-medium">Amount</th>
                      <th className="py-2 px-3 text-right font-medium">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {(invoice.payments || []).map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 text-stone-700">
                          {formatFinancialDate(p.paymentDate)}
                        </td>
                        <td className="py-2 px-3 text-stone-900 font-medium capitalize">
                          {p.paymentMethod.replace("_", " ")}
                        </td>
                        <td className="py-2 px-3 text-stone-600 font-mono">
                          {p.transactionReference || "—"}
                        </td>
                        <td className="py-2 px-3 text-stone-600">
                          {p.receivedByName || "Staff"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">
                          {formatINR(p.amount)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {p.receiptUrl ? (
                            <a
                              href={p.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 hover:underline flex items-center justify-end gap-1"
                            >
                              <Download className="w-3 h-3" /> View
                            </a>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Notes & Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {invoice.notes && (
                <div className="bg-stone-50 p-3 rounded border border-stone-200">
                  <span className="font-semibold text-stone-700 block mb-1">Notes:</span>
                  <p className="text-stone-600 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div className="bg-stone-50 p-3 rounded border border-stone-200">
                  <span className="font-semibold text-stone-700 block mb-1">
                    Terms & Instructions:
                  </span>
                  <p className="text-stone-600 whitespace-pre-wrap font-mono">
                    {invoice.terms}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {invoice.status !== "void" &&
              invoice.status !== "cancelled" &&
              invoice.amountPaid === 0 &&
              onStatusChange && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updatingStatus}
                  onClick={() => handleUpdateStatus("cancelled")}
                  className="text-xs text-stone-600 hover:text-stone-900"
                >
                  Mark Cancelled
                </Button>
              )}
            {invoice.status !== "void" && onStatusChange && (
              <Button
                variant="outline"
                size="sm"
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus("void")}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              >
                Void Invoice
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {invoice.amountPaid === 0 && invoice.status !== "cancelled" && invoice.status !== "void" && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(invoice);
                }}
                className="text-xs"
              >
                Edit Invoice
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs bg-stone-900 hover:bg-stone-800 text-white"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
