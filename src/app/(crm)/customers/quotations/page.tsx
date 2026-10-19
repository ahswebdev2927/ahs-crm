"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileCheck, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { QuotationTable } from "@/features/quotations/components/quotation-table";
import { QuotationFilters } from "@/features/quotations/components/quotation-filters";
import { QuotationDialog } from "@/features/quotations/components/quotation-dialog";
import { QuotationDetailDialog } from "@/features/quotations/components/quotation-detail-dialog";
import { QuotationPrintPreview } from "@/features/quotations/components/quotation-print-preview";
import { InvoiceDialog } from "@/features/invoices/components/invoice-dialog";
import { formatINR } from "@/lib/formatters";
import type {
  QuotationItem,
  QuotationDetail,
  QuotationKpis,
  QuotationStatus,
} from "@/features/quotations/types/quotation.types";

export default function QuotationsPage() {
  const [items, setItems] = React.useState<QuotationItem[]>([]);
  const [stats, setStats] = React.useState<QuotationKpis>({
    totalQuotations: 0,
    draftCount: 0,
    sentCount: 0,
    acceptedCount: 0,
    declinedCount: 0,
    expiredCount: 0,
    totalPipelineValue: 0,
    acceptedValue: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);

  // Filters
  const [status, setStatus] = React.useState<string>("all");
  const [search, setSearch] = React.useState<string>("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedQuote, setSelectedQuote] = React.useState<QuotationDetail | null>(null);
  const [quoteToEdit, setQuoteToEdit] = React.useState<QuotationDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);

  // Convert to Invoice modal state
  const [convertTargetQuote, setConvertTargetQuote] = React.useState<QuotationItem | null>(null);
  const [isConvertOpen, setIsConvertOpen] = React.useState(false);

  const fetchQuotations = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "100");

      const [listRes, statsRes] = await Promise.all([
        fetch(`/api/quotations?${params.toString()}`),
        fetch("/api/quotations/stats"),
      ]);

      if (listRes.ok) {
        const data = await listRes.json();
        if (data?.data?.items) setItems(data.data.items);
      }

      if (statsRes.ok) {
        const sData = await statsRes.json();
        if (sData?.data?.stats) setStats(sData.data.stats);
      }
    } catch (_err) {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }, [status, search]);

  React.useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleView = async (quote: QuotationItem) => {
    try {
      const res = await fetch(`/api/quotations/${quote.id}`);
      const data = await res.json();
      if (res.ok && data?.data?.quotation) {
        setSelectedQuote(data.data.quotation);
        setIsDetailOpen(true);
      }
    } catch (_err) {
      // Handled
    }
  };

  const handleEdit = async (quote: QuotationItem) => {
    try {
      const res = await fetch(`/api/quotations/${quote.id}`);
      const data = await res.json();
      if (res.ok && data?.data?.quotation) {
        setQuoteToEdit(data.data.quotation);
        setIsCreateOpen(true);
      }
    } catch (_err) {
      // Handled
    }
  };

  const handlePrint = async (quote: QuotationItem) => {
    try {
      const res = await fetch(`/api/quotations/${quote.id}`);
      const data = await res.json();
      if (res.ok && data?.data?.quotation) {
        setSelectedQuote(data.data.quotation);
        setIsPrintOpen(true);
      }
    } catch (_err) {
      // Handled
    }
  };

  const handleStatusChange = async (quote: QuotationItem, newStatus: QuotationStatus) => {
    try {
      const res = await fetch(`/api/quotations/${quote.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchQuotations();
        if (selectedQuote && selectedQuote.id === quote.id) {
          setSelectedQuote((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (_err) {
      // Handled
    }
  };

  const handleStartConvert = (quote: QuotationItem) => {
    setConvertTargetQuote(quote);
    setIsConvertOpen(true);
  };

  return (
    <div className="flex-1 space-y-4">
      <PageHeader
        title="Sales Quotations & Proposals"
        description="Draft and issue itemized commercial proposals, track approval lifecycle, and generate customer invoices."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Customers", href: "/customers/customers" },
          { label: "Quotations" },
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setQuoteToEdit(null);
              setIsCreateOpen(true);
            }}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Create Quotation</span>
          </Button>
        }
      />

      <div className="w-full p-4 sm:p-5 xl:p-6 space-y-4">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileCheck className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[11px] font-medium text-muted-foreground">Total Proposals</div>
                <div className="text-xl font-bold text-foreground">{stats.totalQuotations}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[11px] font-medium text-muted-foreground">Active Pipeline</div>
                <div className="text-xl font-bold text-foreground truncate">
                  {formatINR(stats.totalPipelineValue)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[11px] font-medium text-muted-foreground">Accepted Deals</div>
                <div className="text-xl font-bold text-emerald-600 truncate">
                  {stats.acceptedCount} ({formatINR(stats.acceptedValue)})
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[11px] font-medium text-muted-foreground">Pending Review</div>
                <div className="text-xl font-bold text-foreground">
                  {stats.sentCount + stats.draftCount}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        <QuotationFilters
          status={status}
          onStatusChange={setStatus}
          search={search}
          onSearchChange={setSearch}
          onReset={() => {
            setStatus("all");
            setSearch("");
          }}
        />

        {/* Quotations Table */}
        <QuotationTable
          items={items}
          isLoading={isLoading}
          onView={handleView}
          onEdit={handleEdit}
          onStatusChange={handleStatusChange}
          onConvertToInvoice={handleStartConvert}
          onPrintPreview={handlePrint}
        />
      </div>

      {/* Creation/Edit Modal */}
      <QuotationDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        quoteToEdit={quoteToEdit}
        onSuccess={fetchQuotations}
      />

      {/* Detail Dialog */}
      <QuotationDetailDialog
        quote={selectedQuote}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onStatusChange={async (q, s) => handleStatusChange(q, s)}
        onConvertToInvoice={(q) => handleStartConvert(q)}
        onPrintPreview={() => setIsPrintOpen(true)}
      />

      {/* Print Preview */}
      <QuotationPrintPreview
        quote={selectedQuote}
        open={isPrintOpen}
        onOpenChange={setIsPrintOpen}
      />

      {/* Convert to Invoice Dialog */}
      {isConvertOpen && (
        <InvoiceDialog
          open={isConvertOpen}
          onOpenChange={setIsConvertOpen}
          preselectedQuotation={convertTargetQuote}
          preselectedCustomerId={convertTargetQuote?.customerId || undefined}
          preselectedClientName={
            convertTargetQuote?.customer?.name || convertTargetQuote?.lead?.name || undefined
          }
          onSuccess={() => {
            fetchQuotations();
          }}
        />
      )}
    </div>
  );
}
