"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { PaymentKpiCards } from "@/features/payments/components/payment-kpis";
import { PaymentFilters, type CustomerOption } from "@/features/payments/components/payment-filters";
import { PaymentTable } from "@/features/payments/components/payment-table";
import { RecordPaymentDialog } from "@/features/payments/components/record-payment-dialog";
import { InvoiceDetailDialog } from "@/features/invoices/components/invoice-detail-dialog";
import { InvoicePrintPreview } from "@/features/invoices/components/invoice-print-preview";
import type { PaymentItem, PaymentKpis } from "@/features/payments/types/payment.types";
import type { InvoiceDetail } from "@/features/invoices/types/invoice.types";
import { useTableQueryParams } from "@/lib/hooks/use-table-query-params";

export default function PaymentsPage() {
  const { getParam, getNumberParam, setQueryParams, resetFilters } = useTableQueryParams();

  const [payments, setPayments] = React.useState<PaymentItem[]>([]);
  const [customers, setCustomers] = React.useState<CustomerOption[]>([]);
  const [stats, setStats] = React.useState<PaymentKpis>({
    totalCollected: 0,
    todayCollected: 0,
    monthCollected: 0,
    transactionCount: 0,
    methodBreakdown: {},
  });
  const [loading, setLoading] = React.useState(true);
  const [totalCount, setTotalCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(getNumberParam("page", 1));
  const [totalPages, setTotalPages] = React.useState(1);

  // Filters from URL
  const [search, setSearch] = React.useState(getParam("search", ""));
  const [method, setMethod] = React.useState(getParam("paymentMethod", "all"));
  const [status, setStatus] = React.useState(getParam("status", "all"));
  const [selectedCustomerId, setSelectedCustomerId] = React.useState(getParam("customerId", "all"));
  const [dateFrom, setDateFrom] = React.useState<string | null>(getParam("dateFrom", "") || null);
  const [dateTo, setDateTo] = React.useState<string | null>(getParam("dateTo", "") || null);

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
      if (status && status !== "all") params.set("status", status);
      if (selectedCustomerId && selectedCustomerId !== "all") params.set("customerId", selectedCustomerId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
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
  }, [search, method, status, selectedCustomerId, dateFrom, dateTo, currentPage]);

  const fetchCustomers = React.useCallback(async () => {
    try {
      const res = await fetch("/api/customers?limit=100");
      const data = await res.json();
      if (res.ok && data?.data?.items) {
        setCustomers(
          data.data.items.map((c: any) => ({
            id: c.id,
            name: c.name,
          }))
        );
      }
    } catch (_err) {}
  }, []);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  React.useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleResetFilters = () => {
    setSearch("");
    setMethod("all");
    setStatus("all");
    setSelectedCustomerId("all");
    setDateFrom(null);
    setDateTo(null);
    setCurrentPage(1);
    resetFilters();
  };

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
            className="text-xs h-8 gap-1.5 cursor-pointer"
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
          setQueryParams({ search: val });
        }}
        method={method}
        onMethodChange={(val) => {
          setMethod(val);
          setCurrentPage(1);
          setQueryParams({ paymentMethod: val });
        }}
        status={status}
        onStatusChange={(val) => {
          setStatus(val);
          setCurrentPage(1);
          setQueryParams({ status: val });
        }}
        selectedCustomerId={selectedCustomerId}
        onCustomerChange={(val) => {
          setSelectedCustomerId(val);
          setCurrentPage(1);
          setQueryParams({ customerId: val });
        }}
        customers={customers}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateRangeChange={({ dateFrom: df, dateTo: dt }) => {
          setDateFrom(df || null);
          setDateTo(dt || null);
          setCurrentPage(1);
          setQueryParams({ dateFrom: df, dateTo: dt });
        }}
        onReset={handleResetFilters}
      />

      {/* Transactions Table */}
      <PaymentTable
        payments={payments}
        loading={loading}
        totalCount={totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => {
          setCurrentPage(page);
          setQueryParams({ page }, { resetPage: false });
        }}
        onViewInvoice={handleViewInvoice}
        onPaymentUpdated={fetchPayments}
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
