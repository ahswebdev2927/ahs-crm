"use client";

import * as React from "react";
import { Printer, Download, ArrowLeft, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatINR, formatFinancialDate } from "@/lib/formatters";
import type { QuotationDetail } from "../types/quotation.types";

interface QuotationPrintPreviewProps {
  quote: QuotationDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuotationPrintPreview({
  quote: rawQuote,
  open,
  onOpenChange,
}: QuotationPrintPreviewProps) {
  const quote = ((rawQuote as any)?.quotation || rawQuote) as QuotationDetail | null;

  if (!quote) return null;

  const handlePrint = () => {
    window.print();
  };

  const clientName = quote.customer?.name || quote.lead?.name || "Client";
  const clientCompany = quote.customer?.company || quote.lead?.company;
  const clientAddress = quote.customer?.address || quote.lead?.address;
  const clientEmail = quote.customer?.email || quote.lead?.email;
  const clientPhone = quote.customer?.phone || quote.lead?.phone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl max-h-[95vh] overflow-y-auto p-0 border-0 sm:border sm:rounded-xl">
        {/* Floating Print Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-muted/80 backdrop-blur border-b border-border print:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="text-xs font-semibold cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print Proposal
          </Button>
        </div>

        {/* Printable Proposal Document */}
        <div className="p-8 sm:p-12 bg-white text-zinc-900 font-sans print:p-0 print:m-0">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-6 mb-8">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-white font-bold text-lg">
                  A
                </div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                  ANANYA HI-SOLUTIONS
                </h1>
              </div>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                Empowering businesses with enterprise IT, digital marketing, cloud hosting, and creative software solutions.
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                GSTIN: 27AABCA1234F1Z5 • info@ananyahisolutions.com
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold tracking-widest text-primary uppercase block">
                Commercial Proposal
              </span>
              <div className="text-2xl font-mono font-bold text-zinc-900 mt-0.5">
                {quote.quoteNumber}
              </div>
              <div className="text-xs text-zinc-600 mt-1">
                <span>Date: {formatFinancialDate(quote.createdAt)}</span>
              </div>
              <div className="text-xs font-medium text-amber-700 mt-0.5">
                <span>Valid Until: {formatFinancialDate(quote.validUntil)}</span>
              </div>
            </div>
          </div>

          {/* Client & Billing Recipient */}
          <div className="grid grid-cols-2 gap-8 mb-8 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Prepared For
              </span>
              <div className="text-sm font-bold text-zinc-900">{clientName}</div>
              {clientCompany && <div className="text-zinc-700 font-medium">{clientCompany}</div>}
              {clientAddress && <div className="text-zinc-600 leading-relaxed">{clientAddress}</div>}
              {clientEmail && <div className="text-zinc-600">{clientEmail}</div>}
              {clientPhone && <div className="text-zinc-600">{clientPhone}</div>}
            </div>

            <div className="space-y-1 text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Issued By
              </span>
              <div className="font-semibold text-zinc-900">
                {quote.createdBy?.name || "AHS Sales Team"}
              </div>
              <div className="text-zinc-600">{quote.createdBy?.email}</div>
              <div className="text-zinc-500 mt-1">Status: {quote.status.toUpperCase()}</div>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left text-xs mb-8 border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-900 text-zinc-900 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-2">#</th>
                <th className="py-2.5 px-2">Deliverable / Scope</th>
                <th className="py-2.5 px-2 text-center">Qty</th>
                <th className="py-2.5 px-2 text-right">Unit Price</th>
                <th className="py-2.5 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {(quote.items || []).map((item, index) => (
                <tr key={item.id}>
                  <td className="py-3 px-2 text-zinc-400">{index + 1}</td>
                  <td className="py-3 px-2 font-medium text-zinc-900">{item.description}</td>
                  <td className="py-3 px-2 text-center text-zinc-600">{item.quantity}</td>
                  <td className="py-3 px-2 text-right font-mono text-zinc-600">
                    {formatINR(item.unitPrice)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold text-zinc-900">
                    {formatINR(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="flex justify-end mb-10 text-xs">
            <div className="w-64 space-y-2 border-t border-zinc-300 pt-3">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">{formatINR(quote.subtotal)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span className="font-mono font-medium">- {formatINR(quote.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-600">
                <span>GST:</span>
                <span className="font-mono font-medium">{formatINR(quote.tax)}</span>
              </div>
              <div className="border-t-2 border-zinc-900 pt-2 flex justify-between text-sm font-bold text-zinc-900">
                <span>Grand Total:</span>
                <span className="font-mono text-base">{formatINR(quote.total)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          {quote.terms && (
            <div className="border-t border-zinc-200 pt-4 mb-10 text-[11px] text-zinc-600 leading-relaxed">
              <span className="font-bold text-zinc-900 block mb-1 uppercase tracking-wider text-[10px]">
                Terms & Conditions
              </span>
              <div className="whitespace-pre-line">{quote.terms}</div>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 pt-12 border-t border-zinc-300 text-xs mt-12">
            <div>
              <div className="h-12 border-b border-zinc-400 w-48 mb-2"></div>
              <div className="font-bold text-zinc-900">Authorized Signatory</div>
              <div className="text-zinc-500">Ananya Hi-Solutions</div>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="h-12 border-b border-zinc-400 w-48 mb-2"></div>
              <div className="font-bold text-zinc-900">Client Acceptance</div>
              <div className="text-zinc-500">{clientName}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
