"use client";

import * as React from "react";
import { Plus, CreditCard, Receipt, FileText, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/formatters";
import { InvoiceTable } from "./invoice-table";
import { InvoiceDialog } from "./invoice-dialog";
import { InvoiceDetailDialog } from "./invoice-detail-dialog";
import { InvoicePrintPreview } from "./invoice-print-preview";
import { RecordPaymentDialog } from "@/features/payments/components/record-payment-dialog";
import type { InvoiceDetail, InvoiceItem } from "../types/invoice.types";

interface CustomerBillingTabProps {
  customerId: string;
  customerName: string;
  canManageBilling?: boolean;
}

export function CustomerBillingTab({
  customerId,
  customerName,
  canManageBilling = true,
}: CustomerBillingTabProps) {
  const [invoices, setInvoices] = React.useState<InvoiceItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [totalCount, setTotalCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Dialog States
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceDetail | null>(null);
  const [printPreviewOpen, setPrintPreviewOpen] = React.useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = React.useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = React.useState<InvoiceDetail | InvoiceItem | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = React.useState<InvoiceDetail | null>(null);

  const fetchCustomerInvoices = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices?customerId=${customerId}&page=${page}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.data.items || []);
        setTotalCount(data.data.pagination?.total ?? data.data.total ?? 0);
        setTotalPages(data.data.pagination?.totalPages ?? data.data.totalPages ?? 1);
      }
    } catch (err) {
      console.error("Error fetching customer invoices:", err);
    } finally {
      setLoading(false);
    }
  }, [customerId, page]);

  React.useEffect(() => {
    fetchCustomerInvoices();
  }, [fetchCustomerInvoices]);

  // Aggregate Customer Financial Summaries
  const { totalInvoiced, totalPaid, totalOutstanding } = React.useMemo(() => {
    let invoiced = 0;
    let paid = 0;
    let outstanding = 0;

    for (const inv of invoices) {
      if (inv.status !== "void" && inv.status !== "cancelled") {
        invoiced += inv.total;
        paid += inv.amountPaid;
        outstanding += inv.amountDue;
      }
    }

    return {
      totalInvoiced: invoiced,
      totalPaid: paid,
      totalOutstanding: outstanding,
    };
  }, [invoices]);

  const handleOpenDetail = async (invoice: InvoiceItem) => {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedInvoice(data?.data?.invoice || data?.data);
        setDetailDialogOpen(true);
      }
    } catch (err) {
      console.error("Error fetching invoice details:", err);
    }
  };

  const handleOpenPayment = (invoice: InvoiceItem) => {
    setInvoiceForPayment(invoice);
    setRecordPaymentOpen(true);
  };

  const handleOpenPrint = async (invoice: InvoiceItem) => {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedInvoice(data?.data?.invoice || data?.data);
        setPrintPreviewOpen(true);
      }
    } catch (err) {
      console.error("Error fetching invoice for print:", err);
    }
  };

  const handleEdit = async (inv: InvoiceItem) => {
    try {
      const res = await fetch(`/api/invoices/${inv.id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoiceToEdit(data?.data?.invoice || data?.data);
        setCreateDialogOpen(true);
      }
    } catch (err) {
      console.error("Error fetching invoice for edit:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
          <div className="text-xs font-medium text-stone-500">Total Billed</div>
          <div className="text-xl font-bold font-mono text-stone-900 mt-1">
            {formatINR(totalInvoiced)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Across active invoices</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
          <div className="text-xs font-medium text-stone-500">Total Collections</div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatINR(totalPaid)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Realized payments</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
          <div className="text-xs font-medium text-stone-500">Outstanding Balance</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              totalOutstanding > 0 ? "text-rose-600" : "text-stone-900"
            }`}
          >
            {formatINR(totalOutstanding)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Pending collection</div>
        </div>
      </div>

      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-700" />
            Billing &amp; Tax Invoices ({totalCount})
          </h3>
          <p className="text-xs text-stone-500">
            GST tax invoices, receipts, and outstanding ledger for {customerName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCustomerInvoices}
            className="text-xs h-8"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
          {canManageBilling && (
            <Button
              size="sm"
              onClick={() => {
                setInvoiceToEdit(null);
                setCreateDialogOpen(true);
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Create Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <InvoiceTable
        invoices={invoices}
        loading={loading}
        totalCount={totalCount}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onViewDetails={handleOpenDetail}
        onEdit={handleEdit}
        onRecordPayment={handleOpenPayment}
        onPrintPreview={handleOpenPrint}
      />

      {/* Dialogs */}
      <InvoiceDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setInvoiceToEdit(null);
        }}
        invoiceToEdit={invoiceToEdit}
        preselectedCustomerId={customerId}
        preselectedCustomerName={customerName}
        onSuccess={fetchCustomerInvoices}
      />

      <InvoiceDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        invoice={selectedInvoice}
        onRecordPayment={(inv) => {
          setDetailDialogOpen(false);
          setInvoiceForPayment(inv);
          setRecordPaymentOpen(true);
        }}
        onPrintPreview={(inv) => {
          setDetailDialogOpen(false);
          setSelectedInvoice(inv);
          setPrintPreviewOpen(true);
        }}
        onEdit={(inv) => {
          setDetailDialogOpen(false);
          handleEdit(inv);
        }}
        onStatusChange={async (invId, status) => {
          await fetch(`/api/invoices/${invId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });
          fetchCustomerInvoices();
        }}
      />

      <InvoicePrintPreview
        open={printPreviewOpen}
        onOpenChange={setPrintPreviewOpen}
        invoice={selectedInvoice}
      />

      <RecordPaymentDialog
        open={recordPaymentOpen}
        onOpenChange={setRecordPaymentOpen}
        invoice={invoiceForPayment}
        onSuccess={() => {
          fetchCustomerInvoices();
          if (selectedInvoice && invoiceForPayment && selectedInvoice.id === invoiceForPayment.id) {
            handleOpenDetail(invoiceForPayment as InvoiceItem);
          }
        }}
      />
    </div>
  );
}
