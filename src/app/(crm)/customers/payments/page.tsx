"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { CreditCard, RefreshCw } from "lucide-react";
import { PaymentKpiCards } from "@/features/payments/components/payment-kpis";
import { PaymentFilters } from "@/features/payments/components/payment-filters";
import { PaymentTable } from "@/features/payments/components/payment-table";
import { RecordPaymentDialog } from "@/features/payments/components/record-payment-dialog";
import { InvoiceDetailDialog } from "@/features/invoices/components/invoice-detail-dialog";
import { InvoicePrintPreview } from "@/features/invoices/components/invoice-print-preview";
import type { PaymentItem, PaymentKpis } from "@/features/payments/types/payment.types";
import type { InvoiceDetail } from "@/features/invoices/types/invoice.types";

export default function PaymentsPage() {
  const [payments, setPayments] = React.useState<PaymentItem[]>([]);
  const [stats, setStats] = React.useState<PaymentKpis>({
    totalCollected: 0,
    todayCollected: 0,
    monthCollected: 0,
    transactionCount: 0,
    methodBreakdown: {},
  });
  const [loading, setLoading] = React.useState(true);
  const [totalCount, setTotalCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Filters
  const [search, setSearch] = React.useState("");
  const [method, setMethod] = React.useState("all");

  // Invoice Inspection Modal
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceDetail | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = React.useState(false);
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);

  // Record Payment
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = React.useState(false);

  const fetchPayments = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (method && method !== "all") params.set("paymentMethod", method);
      params.set("page", String(currentPage));
      params.set("limit", "20");

      const [listRes, statsRes] = await Promise.all([
        fetch(`/api/payments?${params.toString()}`),
        fetch("/api/payments/stats"),
      ]);

      if (listRes.ok) {
        const data = await listRes.json();
        if (data?.data?.items) {
          setPayments(data.data.items);
          setTotalCount(data.data.pagination?.total ?? data.data.total ?? 0);
          setTotalPages(data.data.pagination?.totalPages ?? data.data.totalPages ?? 1);
        }
      }

      if (statsRes.ok) {
        const sData = await statsRes.json();
        if (sData?.data?.stats) setStats(sData.data.stats);
      }
    } catch (_err) {
      // Handled
    } finally {
      setLoading(false);
    }
  }, [search, method, currentPage]);

  React.useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          setSelectedInvoice(data.data.invoice || data.data);
          setIsInvoiceOpen(true);
        }
      }
    } catch (_err) {
      // Handled
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Payment Receipts"
        description="Transactions ledger, customer remittances, and receipts registry."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Customers", href: "/customers/customers" },
          { label: "Payments" },
        ]}
        actions={
          <Button
            size="sm"
            onClick={fetchPayments}
            variant="outline"
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Ledger</span>
          </Button>
        }
      />

      {/* KPI Cards */}
      <PaymentKpiCards kpis={stats} loading={loading && payments.length === 0} />

      {/* Filters */}
      <PaymentFilters
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        method={method}
        onMethodChange={(val) => {
          setMethod(val);
          setCurrentPage(1);
        }}
        onReset={() => {
          setSearch("");
          setMethod("all");
          setCurrentPage(1);
        }}
      />

      {/* Transactions Table */}
      <PaymentTable
        payments={payments}
        loading={loading}
        totalCount={totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onViewInvoice={handleViewInvoice}
      />

      {/* Invoice Detail Dialog (from clicking invoice number) */}
      <InvoiceDetailDialog
        open={isInvoiceOpen}
        onOpenChange={setIsInvoiceOpen}
        invoice={selectedInvoice}
        onPrintPreview={(inv) => {
          setIsInvoiceOpen(false);
          setSelectedInvoice(inv);
          setIsPrintOpen(true);
        }}
        onRecordPayment={() => {
          setIsInvoiceOpen(false);
          setIsRecordPaymentOpen(true);
        }}
      />

      {/* Print Preview Dialog */}
      <InvoicePrintPreview
        open={isPrintOpen}
        onOpenChange={setIsPrintOpen}
        invoice={selectedInvoice}
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={isRecordPaymentOpen}
        onOpenChange={setIsRecordPaymentOpen}
        invoice={selectedInvoice}
        onSuccess={() => {
          fetchPayments();
          if (selectedInvoice) {
            handleViewInvoice(selectedInvoice.id);
          }
        }}
      />
    </div>
  );
}
