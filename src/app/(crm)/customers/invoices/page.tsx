"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Receipt,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { InvoiceTable } from "@/features/invoices/components/invoice-table";
import { InvoiceFilters } from "@/features/invoices/components/invoice-filters";
import { InvoiceDialog } from "@/features/invoices/components/invoice-dialog";
import { InvoiceDetailDialog } from "@/features/invoices/components/invoice-detail-dialog";
import { InvoicePrintPreview } from "@/features/invoices/components/invoice-print-preview";
import { RecordPaymentDialog } from "@/features/payments/components/record-payment-dialog";
import { formatINR } from "@/lib/formatters";
import type {
  InvoiceItem,
  InvoiceDetail,
  InvoiceKpis,
  InvoiceStatus,
} from "@/features/invoices/types/invoice.types";

export default function InvoicesPage() {
  const [items, setItems] = React.useState<InvoiceItem[]>([]);
  const [stats, setStats] = React.useState<InvoiceKpis>({
    totalBilled: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
    totalInvoices: 0,
    unpaidCount: 0,
    partiallyPaidCount: 0,
    paidCount: 0,
    overdueCount: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [totalCount, setTotalCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Filters
  const [status, setStatus] = React.useState<string>("all");
  const [search, setSearch] = React.useState<string>("");
  const [overdueOnly, setOverdueOnly] = React.useState<boolean>(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceDetail | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = React.useState<InvoiceDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);

  // Record Payment Modal
  const [invoiceForPayment, setInvoiceForPayment] = React.useState<InvoiceDetail | InvoiceItem | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);

  const fetchInvoices = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      if (overdueOnly) params.set("overdueOnly", "true");
      params.set("page", String(currentPage));
      params.set("limit", "20");

      const [listRes, statsRes] = await Promise.all([
        fetch(`/api/invoices?${params.toString()}`),
        fetch("/api/invoices/stats"),
      ]);

      if (listRes.ok) {
        const data = await listRes.json();
        if (data?.data?.items) {
          setItems(data.data.items);
          setTotalCount(data.data.pagination?.total ?? data.data.total ?? 0);
          setTotalPages(data.data.pagination?.totalPages ?? data.data.totalPages ?? 1);
        }
      }

      if (statsRes.ok) {
        const sData = await statsRes.json();
        if (sData?.data?.stats) setStats(sData.data.stats);
      }
    } catch (_err) {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  }, [status, search, overdueOnly, currentPage]);

  React.useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleView = async (inv: InvoiceItem) => {
    try {
      const res = await fetch(`/api/invoices/${inv.id}`);
      const data = await res.json();
      if (res.ok && data?.data) {
        setSelectedInvoice(data.data.invoice || data.data);
        setIsDetailOpen(true);
      }
    } catch (_err) {
      // Handled
    }
  };

  const handleEdit = async (inv: InvoiceItem) => {
    try {
      const res = await fetch(`/api/invoices/${inv.id}`);
      const data = await res.json();
      if (res.ok && data?.data) {
        setInvoiceToEdit(data.data.invoice || data.data);
        setIsCreateOpen(true);
      }
    } catch (_err) {
      // Handled
    }
  };

  const handlePrint = async (inv: InvoiceItem) => {
    try {
      const res = await fetch(`/api/invoices/${inv.id}`);
      const data = await res.json();
      if (res.ok && data?.data) {
        setSelectedInvoice(data.data.invoice || data.data);
        setIsPrintOpen(true);
      }
    } catch (_err) {
      // Handled
    }
  };

  const handleRecordPayment = (inv: InvoiceItem | InvoiceDetail) => {
    setInvoiceForPayment(inv);
    setIsPaymentOpen(true);
  };

  const handleStatusChange = async (invoiceId: string, newStatus: InvoiceStatus) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchInvoices();
        if (selectedInvoice && selectedInvoice.id === invoiceId) {
          const detailRes = await fetch(`/api/invoices/${invoiceId}`);
          const detailData = await detailRes.json();
          if (detailData?.data) setSelectedInvoice(detailData.data.invoice || detailData.data);
        }
      }
    } catch (_err) {
      // Handled
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Client Invoices"
        description="Issue, track, and manage GST tax invoices and customer receivables."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Customers", href: "/customers/customers" },
          { label: "Invoices" },
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setInvoiceToEdit(null);
              setIsCreateOpen(true);
            }}
            className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create Invoice</span>
          </Button>
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-stone-200">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">Total Billed</span>
              <div className="p-1.5 rounded-md bg-stone-100 text-stone-700">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold font-mono text-stone-900">
                {formatINR(stats.totalBilled)}
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {stats.totalInvoices} invoices issued
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">Total Collected</span>
              <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold font-mono text-emerald-700">
                {formatINR(stats.totalCollected)}
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {stats.paidCount} fully paid invoices
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">Outstanding Balance</span>
              <div className="p-1.5 rounded-md bg-amber-50 text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold font-mono text-stone-900">
                {formatINR(stats.totalOutstanding)}
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {stats.unpaidCount + stats.partiallyPaidCount} unpaid or partial
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardContent className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">Overdue Balance</span>
              <div className="p-1.5 rounded-md bg-rose-50 text-rose-700">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold font-mono text-rose-600">
                {formatINR(stats.totalOverdue)}
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {stats.overdueCount} overdue invoices
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Component */}
      <InvoiceFilters
        status={status}
        onStatusChange={(val) => {
          setStatus(val);
          setCurrentPage(1);
        }}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        overdueOnly={overdueOnly}
        onOverdueToggle={() => {
          setOverdueOnly((prev) => !prev);
          setCurrentPage(1);
        }}
        onReset={() => {
          setStatus("all");
          setSearch("");
          setOverdueOnly(false);
          setCurrentPage(1);
        }}
      />

      {/* Invoices Table */}
      <InvoiceTable
        invoices={items}
        loading={isLoading}
        totalCount={totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onViewDetails={handleView}
        onEdit={handleEdit}
        onRecordPayment={handleRecordPayment}
        onPrintPreview={handlePrint}
      />

      {/* Create / Edit Dialog */}
      <InvoiceDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        invoiceToEdit={invoiceToEdit}
        onSuccess={fetchInvoices}
      />

      {/* Detail Dialog */}
      <InvoiceDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        invoice={selectedInvoice}
        onRecordPayment={(inv) => {
          setIsDetailOpen(false);
          handleRecordPayment(inv);
        }}
        onPrintPreview={(inv) => {
          setIsDetailOpen(false);
          setSelectedInvoice(inv);
          setIsPrintOpen(true);
        }}
        onEdit={(inv) => {
          setIsDetailOpen(false);
          handleEdit(inv);
        }}
        onStatusChange={handleStatusChange}
      />

      {/* Print Preview Dialog */}
      <InvoicePrintPreview
        open={isPrintOpen}
        onOpenChange={setIsPrintOpen}
        invoice={selectedInvoice}
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        invoice={invoiceForPayment}
        onSuccess={() => {
          fetchInvoices();
          if (selectedInvoice && invoiceForPayment && selectedInvoice.id === invoiceForPayment.id) {
            handleView(invoiceForPayment as InvoiceItem);
          }
        }}
      />
    </div>
  );
}
