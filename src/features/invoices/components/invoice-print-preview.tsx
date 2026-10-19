"use client";

import * as React from "react";
import { Printer, Download, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatINR, formatFinancialDate } from "@/lib/formatters";
import type { InvoiceDetail } from "../types/invoice.types";

interface InvoicePrintPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceDetail | null;
}

/**
 * Utility to convert amount in Rupees to Indian English words.
 */
function numberToWordsINR(amountRupees: number): string {
  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertTwoDigits(n: number): string {
    if (n < 20) return units[n];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "");
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = "";
    if (hundred > 0) {
      res += units[hundred] + " Hundred";
      if (rest > 0) res += " and ";
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  }

  const rounded = Math.round(amountRupees);
  if (rounded === 0) return "Zero Rupees Only";

  let n = rounded;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundreds = n;

  const parts: string[] = [];
  if (crore > 0) parts.push(convertThreeDigits(crore) + " Crore");
  if (lakh > 0) parts.push(convertThreeDigits(lakh) + " Lakh");
  if (thousand > 0) parts.push(convertThreeDigits(thousand) + " Thousand");
  if (hundreds > 0) parts.push(convertThreeDigits(hundreds));

  return parts.join(" ") + " Rupees Only";
}

export function InvoicePrintPreview({
  open,
  onOpenChange,
  invoice: rawInvoice,
}: InvoicePrintPreviewProps) {
  const invoice = ((rawInvoice as any)?.invoice || rawInvoice) as InvoiceDetail | null;

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const taxableAmountPaise = Math.max(0, invoice.subtotal - invoice.discount);
  const totalRupees = Math.round(invoice.total / 100);
  const amountWords = numberToWordsINR(totalRupees);

  // Split GST equally into CGST & SGST for intra-state supply
  const halfTaxPaise = Math.round(invoice.tax / 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl max-h-[95vh] overflow-y-auto p-0 border-none bg-stone-100">
        <DialogHeader className="p-4 bg-white border-b flex flex-row items-center justify-between print:hidden sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-stone-500"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <DialogTitle className="text-base font-bold text-stone-900">
              Tax Invoice Preview ({invoice.invoiceNumber})
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Paper Canvas */}
        <div className="p-6 md:p-12 print:p-0 flex justify-center">
          <div
            id="printable-tax-invoice"
            className="w-full max-w-[800px] bg-white p-8 md:p-10 shadow-lg print:shadow-none print:w-full print:p-6 text-stone-800 text-xs border border-stone-200 print:border-none"
          >
            {/* Header: Company & Tax Invoice Title */}
            <div className="flex justify-between items-start pb-6 border-b-2 border-stone-800">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-stone-950 uppercase">
                  AHS Architectural &amp; Hardware Solutions
                </h1>
                <p className="text-[11px] text-stone-600 mt-0.5">
                  Commercial Architectural Hardware, Glazing &amp; Interior Infrastructure
                </p>
                <div className="text-[11px] text-stone-600 mt-2 space-y-0.5">
                  <p>Plot 42, Industrial Area Phase II, Bengaluru, Karnataka, 560058</p>
                  <p>
                    <strong>GSTIN:</strong> 29AABCA1234F1Z5 | <strong>PAN:</strong> AABCA1234F
                  </p>
                  <p>Email: billing@ahs-hardware.in | Phone: +91 80 4123 4567</p>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block bg-stone-900 text-white px-3 py-1 font-bold tracking-wider text-sm uppercase rounded">
                  Tax Invoice
                </div>
                <div className="mt-3 text-right space-y-1">
                  <p className="font-mono font-bold text-sm text-stone-950">
                    {invoice.invoiceNumber}
                  </p>
                  <p className="text-stone-600">
                    <strong>Invoice Date:</strong> {formatFinancialDate(invoice.issueDate)}
                  </p>
                  <p className="text-stone-600">
                    <strong>Due Date:</strong> {formatFinancialDate(invoice.dueDate)}
                  </p>
                  {invoice.quotationNumber && (
                    <p className="text-stone-600">
                      <strong>Ref Quote:</strong> {invoice.quotationNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Buyer Details */}
            <div className="grid grid-cols-2 gap-6 py-4 border-b border-stone-200">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Details of Receiver | Billed To
                </p>
                <p className="font-bold text-stone-950 text-sm">
                  {invoice.customer?.name || "Customer Not Found"}
                </p>
                {invoice.customer?.company && (
                  <p className="font-semibold text-stone-800">{invoice.customer.company}</p>
                )}
                {invoice.customer?.address && (
                  <p className="text-stone-600 whitespace-pre-line mt-1">
                    {invoice.customer.address}
                  </p>
                )}
                <p className="text-stone-600 mt-1">
                  <strong>Phone:</strong> {invoice.customer?.phone || "—"} |{" "}
                  <strong>Email:</strong> {invoice.customer?.email || "—"}
                </p>
              </div>

              <div className="text-right flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Supply Details
                  </p>
                  <p className="text-stone-600">
                    <strong>Place of Supply:</strong> Karnataka (State Code: 29)
                  </p>
                  <p className="text-stone-600">
                    <strong>Reverse Charge Applicable:</strong> No
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase border border-stone-300 bg-stone-50">
                    Status: {invoice.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-stone-100 border-y border-stone-300 text-[11px] text-stone-700">
                    <th className="py-2 px-2 text-left w-8">#</th>
                    <th className="py-2 px-2 text-left">Description of Goods / Services</th>
                    <th className="py-2 px-2 text-center w-20">HSN/SAC</th>
                    <th className="py-2 px-2 text-right w-16">Qty</th>
                    <th className="py-2 px-2 text-right w-24">Rate (₹)</th>
                    <th className="py-2 px-2 text-right w-28">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {(invoice.items || []).map((item, index) => (
                    <tr key={item.id || index} className="text-stone-800">
                      <td className="py-2.5 px-2 text-left text-stone-400 font-mono">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-2 text-left font-medium">
                        {item.description}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-stone-500">
                        {item.serviceId ? `9954${String(item.serviceId).padStart(2, "0")}` : "9954"}
                      </td>
                      <td className="py-2.5 px-2 text-right">{item.quantity}</td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        {formatINR(item.unitPrice)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-semibold">
                        {formatINR(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Breakdown */}
            <div className="border-t-2 border-stone-800 pt-3 grid grid-cols-12 gap-4">
              {/* Left Column: Amount in words & Bank Account */}
              <div className="col-span-7 space-y-3">
                <div className="bg-stone-50 p-2.5 rounded border border-stone-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Total Amount in Words:
                  </p>
                  <p className="font-semibold text-stone-900 mt-0.5">{amountWords}</p>
                </div>

                <div className="border border-stone-200 p-2.5 rounded bg-white text-[11px] space-y-1">
                  <p className="font-bold text-stone-900 uppercase tracking-wider text-[10px]">
                    Bank Account Details for Direct Remittance:
                  </p>
                  <p>
                    <strong>Bank Name:</strong> HDFC Bank Ltd.
                  </p>
                  <p>
                    <strong>Account Name:</strong> AHS Architectural &amp; Hardware Solutions
                  </p>
                  <p>
                    <strong>Account Number:</strong> 50200088991122
                  </p>
                  <p>
                    <strong>IFSC Code:</strong> HDFC0001234
                  </p>
                  <p>
                    <strong>UPI ID:</strong> ahsbilling@hdfcbank
                  </p>
                </div>
              </div>

              {/* Right Column: Tax Breakdown Calculations */}
              <div className="col-span-5 space-y-1.5 text-right font-mono text-[11px]">
                <div className="flex justify-between py-0.5 text-stone-600">
                  <span>Subtotal:</span>
                  <span>{formatINR(invoice.subtotal)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between py-0.5 text-emerald-700">
                    <span>Discount:</span>
                    <span>- {formatINR(invoice.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-0.5 text-stone-700 font-semibold border-t border-stone-200">
                  <span>Taxable Value:</span>
                  <span>{formatINR(taxableAmountPaise)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-stone-600">
                  <span>CGST (Central Tax):</span>
                  <span>{formatINR(halfTaxPaise)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-stone-600">
                  <span>SGST (State Tax):</span>
                  <span>{formatINR(invoice.tax - halfTaxPaise)}</span>
                </div>
                <div className="flex justify-between py-1.5 text-sm font-bold text-stone-950 border-y-2 border-stone-900">
                  <span>Total Amount (INR):</span>
                  <span>{formatINR(invoice.total)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-emerald-700">
                  <span>Total Amount Paid:</span>
                  <span>{formatINR(invoice.amountPaid)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-xs text-rose-700 border-t border-stone-200">
                  <span>Balance Due:</span>
                  <span>{formatINR(invoice.amountDue)}</span>
                </div>
              </div>
            </div>

            {/* Terms and Signatures */}
            <div className="mt-8 pt-4 border-t border-stone-300 grid grid-cols-2 gap-6 text-[10px]">
              <div>
                <p className="font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Terms &amp; Conditions:
                </p>
                <p className="text-stone-600 whitespace-pre-line leading-relaxed font-mono">
                  {invoice.terms ||
                    "1. Payment due within 15 days of invoice date.\n2. Goods once delivered and accepted will not be taken back without prior written consent.\n3. Subject to Bengaluru jurisdiction."}
                </p>
              </div>

              <div className="text-right flex flex-col justify-between items-end">
                <p className="text-stone-600">
                  For <strong>AHS Architectural &amp; Hardware Solutions</strong>
                </p>
                <div className="pt-12 text-center">
                  <div className="border-t border-stone-400 w-44 pt-1">
                    <p className="font-bold text-stone-900">Authorized Signatory</p>
                    <p className="text-stone-500 text-[9px]">Digitally authenticated record</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
