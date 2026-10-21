"use client";

import * as React from "react";
import {
  ExternalLink,
  Receipt,
  FileText,
  CreditCard,
  Building,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatFinancialDate } from "@/lib/formatters";
import { PaymentDetailsDialog } from "./payment-details-dialog";
import type { PaymentItem } from "../types/payment.types";

interface PaymentTableProps {
  payments: PaymentItem[];
  loading?: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewInvoice?: (invoiceId: string) => void;
  onPaymentUpdated?: () => void;
}

export function PaymentTable({
  payments,
  loading,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  onViewInvoice,
  onPaymentUpdated,
}: PaymentTableProps) {
  const [selectedPaymentForDetails, setSelectedPaymentForDetails] =
    React.useState<PaymentItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "bank_transfer":
        return (
          <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 text-[10px]">
            Bank (NEFT/RTGS)
          </Badge>
        );
      case "upi":
        return (
          <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px]">
            UPI
          </Badge>
        );
      case "cheque":
        return (
          <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-[10px]">
            Cheque
          </Badge>
        );
      case "cash":
        return (
          <Badge variant="outline" className="text-stone-700 bg-stone-100 border-stone-200 text-[10px]">
            Cash
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200 text-[10px] capitalize">
            {method}
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
            <CheckCircle className="w-2.5 h-2.5 mr-1" /> Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
            <Clock className="w-2.5 h-2.5 mr-1" /> Pending
          </Badge>
        );
      case "refunded":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
            <RotateCcw className="w-2.5 h-2.5 mr-1" /> Refunded
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
            <AlertCircle className="w-2.5 h-2.5 mr-1" /> Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden p-8 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-stone-100 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-stone-200 p-12 text-center">
        <Receipt className="w-12 h-12 mx-auto text-stone-300 mb-3" />
        <h3 className="text-sm font-semibold text-stone-900">No payment transactions found</h3>
        <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
          No receipts or bank remittance logs match your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
            <tr>
              <th className="py-3 px-4 font-semibold">Date</th>
              <th className="py-3 px-4 font-semibold">Invoice #</th>
              <th className="py-3 px-4 font-semibold">Customer</th>
              <th className="py-3 px-4 font-semibold">Mode</th>
              <th className="py-3 px-4 font-semibold">Transaction Reference / UTR</th>
              <th className="py-3 px-4 text-right font-semibold">Amount</th>
              <th className="py-3 px-4 text-center font-semibold">Status</th>
              <th className="py-3 px-4 text-stone-600 whitespace-nowrap">Logged By</th>
              <th className="py-3 px-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-stone-50/70 transition-colors">
                <td className="py-3 px-4 text-stone-700 whitespace-nowrap">
                  {formatFinancialDate(p.paymentDate)}
                </td>

                <td className="py-3 px-4 whitespace-nowrap font-mono font-medium">
                  {p.invoice ? (
                    <button
                      type="button"
                      onClick={() => onViewInvoice && onViewInvoice(p.invoiceId)}
                      className="text-stone-900 hover:text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      {p.invoice.invoiceNumber}
                      <FileText className="w-3 h-3 text-stone-400" />
                    </button>
                  ) : (
                    <span className="text-stone-400">Unknown</span>
                  )}
                </td>

                <td className="py-3 px-4">
                  <div className="font-medium text-stone-900">
                    {p.customer?.name || "Customer Not Found"}
                  </div>
                  {p.customer?.company && (
                    <div className="text-[11px] text-stone-500">{p.customer.company}</div>
                  )}
                </td>

                <td className="py-3 px-4 whitespace-nowrap">{getMethodBadge(p.paymentMethod)}</td>

                <td className="py-3 px-4 font-mono text-stone-600 max-w-[180px] truncate">
                  {p.transactionReference || "—"}
                </td>

                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                  {formatINR(p.amount)}
                </td>

                <td className="py-3 px-4 text-center whitespace-nowrap">
                  {getStatusBadge(p.status)}
                </td>

                <td className="py-3 px-4 text-stone-600 whitespace-nowrap">
                  {p.receivedByName || "Staff"}
                </td>

                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPaymentForDetails(p);
                        setIsDetailsOpen(true);
                      }}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Details
                    </Button>
                    {p.receiptUrl && (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-medium text-[11px] px-1"
                        title="Open external receipt"
                      >
                        <Receipt className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200 bg-stone-50 text-xs text-stone-600">
          <div>
            Showing <span className="font-semibold text-stone-800">{payments.length}</span> of{" "}
            <span className="font-semibold text-stone-800">{totalCount}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="h-8 text-xs gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </Button>
            <span className="text-xs font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="h-8 text-xs gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Details & Reversal Dialog */}
      <PaymentDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        payment={selectedPaymentForDetails}
        onViewInvoice={onViewInvoice}
        onSuccess={onPaymentUpdated}
      />
    </div>
  );
}
