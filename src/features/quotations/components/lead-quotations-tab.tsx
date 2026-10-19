"use client";

import * as React from "react";
import { Plus, FileText, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { QuotationTable } from "./quotation-table";
import { QuotationDialog } from "./quotation-dialog";
import { QuotationDetailDialog } from "./quotation-detail-dialog";
import { QuotationPrintPreview } from "./quotation-print-preview";
import type { QuotationItem, QuotationDetail, QuotationStatus } from "../types/quotation.types";

interface LeadQuotationsTabProps {
  leadId: string;
  leadName: string;
  canEdit: boolean;
  onConvertToInvoice?: (quote: QuotationItem) => void;
}

export function LeadQuotationsTab({
  leadId,
  leadName,
  canEdit,
  onConvertToInvoice,
}: LeadQuotationsTabProps) {
  const [items, setItems] = React.useState<QuotationItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedQuote, setSelectedQuote] = React.useState<QuotationDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);

  const fetchLeadQuotations = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/quotations?leadId=${leadId}&limit=50`);
      const data = await res.json();
      if (res.ok && data?.data?.items) {
        setItems(data.data.items);
      }
    } catch (_err) {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  React.useEffect(() => {
    fetchLeadQuotations();
  }, [fetchLeadQuotations]);

  const handleView = async (quote: QuotationItem) => {
    try {
      const res = await fetch(`/api/quotations/${quote.id}`);
      const data = await res.json();
      if (res.ok && data?.data?.quotation) {
        setSelectedQuote(data.data.quotation);
        setIsDetailOpen(true);
      }
    } catch (_err) {
      // Ignored
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
        fetchLeadQuotations();
        if (selectedQuote && selectedQuote.id === quote.id) {
          setSelectedQuote((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (_err) {
      // Ignored
    }
  };

  const handlePrint = (quote: QuotationItem) => {
    handleView(quote).then(() => setIsPrintOpen(true));
  };

  return (
    <Card className="border border-border shadow-xs bg-card">
      <CardHeader className="pb-3 pt-4 px-4 sm:px-5 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-primary" />
            Commercial Proposals & Quotations
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Pricing agreements and scope documents issued to this prospect.
          </CardDescription>
        </div>

        {canEdit && (
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-8 text-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create Quote
          </Button>
        )}
      </CardHeader>

      <CardContent className="px-4 sm:px-5 pb-5">
        <QuotationTable
          items={items}
          isLoading={isLoading}
          onView={handleView}
          onStatusChange={canEdit ? handleStatusChange : undefined}
          onConvertToInvoice={onConvertToInvoice}
          onPrintPreview={handlePrint}
        />
      </CardContent>

      {/* Creation Modal */}
      <QuotationDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        preselectedLeadId={leadId}
        preselectedClientName={leadName}
        onSuccess={fetchLeadQuotations}
      />

      {/* Detail Dialog */}
      <QuotationDetailDialog
        quote={selectedQuote}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onStatusChange={async (q, s) => handleStatusChange(q, s)}
        onConvertToInvoice={(q) => onConvertToInvoice?.(q)}
        onPrintPreview={() => setIsPrintOpen(true)}
      />

      {/* Print Preview */}
      <QuotationPrintPreview
        quote={selectedQuote}
        open={isPrintOpen}
        onOpenChange={setIsPrintOpen}
      />
    </Card>
  );
}
