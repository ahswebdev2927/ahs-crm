"use client";

import * as React from "react";
import { Plus, Trash2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/formatters";
import type { InvoiceDetail } from "../types/invoice.types";
import type { QuotationItem, QuotationDetail } from "@/features/quotations/types/quotation.types";

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceToEdit?: InvoiceDetail | null;
  preselectedCustomerId?: string;
  preselectedCustomerName?: string;
  preselectedClientName?: string;
  preselectedQuotationId?: string;
  preselectedQuotation?: QuotationItem | QuotationDetail | null;
  initialItems?: FormLineItem[];
  onSuccess: () => void;
}

interface FormLineItem {
  serviceId?: number;
  description: string;
  quantity: number;
  unitPriceRupees: number; // in Rupees for user editing
}

export function InvoiceDialog({
  open,
  onOpenChange,
  invoiceToEdit,
  preselectedCustomerId,
  preselectedCustomerName,
  preselectedClientName,
  preselectedQuotationId,
  preselectedQuotation,
  initialItems,
  onSuccess,
}: InvoiceDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Customer Selection
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>(
    preselectedCustomerId || ""
  );
  const [customersList, setCustomersList] = React.useState<
    { id: string; name: string; company?: string }[]
  >([]);
  const [catalogServices, setCatalogServices] = React.useState<
    { id: number; name: string; price: number }[]
  >([]);

  // Form State
  const [items, setItems] = React.useState<FormLineItem[]>([
    { description: "", quantity: 1, unitPriceRupees: 0 },
  ]);
  const [discountRupees, setDiscountRupees] = React.useState<number>(0);
  const [taxRate, setTaxRate] = React.useState<number>(18);
  const [issueDate, setIssueDate] = React.useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = React.useState<string>("");
  const [terms, setTerms] = React.useState<string>(
    "1. Payment due within 15 calendar days from the date of invoice.\n2. Please mention the Invoice Number in your bank transfer or cheque remarks.\n3. GST applied as per Government of India statutory mandates."
  );

  // Load customers and services catalog on open
  React.useEffect(() => {
    if (!open) return;

    const fetchInitialData = async () => {
      try {
        const [servicesRes, customersRes] = await Promise.all([
          fetch("/api/services?status=active&limit=100"),
          !preselectedCustomerId ? fetch("/api/customers?status=active&limit=100") : null,
        ]);

        if (servicesRes.ok) {
          const data = await servicesRes.json();
          if (data?.data?.items) {
            setCatalogServices(data.data.items);
          }
        }

        if (customersRes && customersRes.ok) {
          const cData = await customersRes.json();
          if (cData?.data?.items) {
            setCustomersList(cData.data.items);
          }
        }
      } catch (err) {
        console.error("Error loading initial data for invoice form:", err);
      }
    };

    fetchInitialData();
  }, [open, preselectedCustomerId]);

  // Initialize or reset form state
  React.useEffect(() => {
    if (!open) return;

    if (invoiceToEdit) {
      setSelectedCustomerId(invoiceToEdit.customerId);
      setIssueDate(new Date(invoiceToEdit.issueDate).toISOString().split("T")[0]);
      setDueDate(new Date(invoiceToEdit.dueDate).toISOString().split("T")[0]);
      setDiscountRupees(Math.round(invoiceToEdit.discount / 100));

      const subtotalWithoutDiscount = invoiceToEdit.subtotal - invoiceToEdit.discount;
      if (subtotalWithoutDiscount > 0 && invoiceToEdit.tax > 0) {
        const calculatedRate = Math.round((invoiceToEdit.tax / subtotalWithoutDiscount) * 100);
        setTaxRate(calculatedRate);
      } else {
        setTaxRate(18);
      }

      setNotes(invoiceToEdit.notes || "");
      setTerms(
        invoiceToEdit.terms ||
          "1. Payment due within 15 calendar days from the date of invoice.\n2. Please mention the Invoice Number in your bank transfer or cheque remarks.\n3. GST applied as per Government of India statutory mandates."
      );

      if (invoiceToEdit.items && invoiceToEdit.items.length > 0) {
        setItems(
          invoiceToEdit.items.map((it) => ({
            serviceId: it.serviceId ?? undefined,
            description: it.description,
            quantity: it.quantity,
            unitPriceRupees: Math.round(it.unitPrice / 100),
          }))
        );
      } else {
        setItems([{ description: "", quantity: 1, unitPriceRupees: 0 }]);
      }
    } else if (preselectedQuotation) {
      setSelectedCustomerId(
        preselectedCustomerId || preselectedQuotation.customerId || ""
      );
      setIssueDate(new Date().toISOString().split("T")[0]);
      const d = new Date();
      d.setDate(d.getDate() + 15);
      setDueDate(d.toISOString().split("T")[0]);
      setDiscountRupees(Math.round((preselectedQuotation.discount || 0) / 100));
      setTaxRate(18);
      setNotes(preselectedQuotation.notes || "");
      setTerms(
        preselectedQuotation.terms ||
          "1. Payment due within 15 calendar days from the date of invoice.\n2. Please mention the Invoice Number in your bank transfer or cheque remarks.\n3. GST applied as per Government of India statutory mandates."
      );
      if ("items" in preselectedQuotation && Array.isArray(preselectedQuotation.items) && preselectedQuotation.items.length > 0) {
        setItems(
          preselectedQuotation.items.map((it) => ({
            serviceId: it.serviceId ?? undefined,
            description: it.description,
            quantity: it.quantity,
            unitPriceRupees: Math.round(it.unitPrice / 100),
          }))
        );
      } else {
        setItems([{ description: "", quantity: 1, unitPriceRupees: 0 }]);
      }
    } else if (initialItems && initialItems.length > 0) {
      setSelectedCustomerId(preselectedCustomerId || "");
      setIssueDate(new Date().toISOString().split("T")[0]);
      const d = new Date();
      d.setDate(d.getDate() + 15);
      setDueDate(d.toISOString().split("T")[0]);
      setDiscountRupees(0);
      setTaxRate(18);
      setNotes("");
      setTerms(
        "1. Payment due within 15 calendar days from the date of invoice.\n2. Please mention the Invoice Number in your bank transfer or cheque remarks.\n3. GST applied as per Government of India statutory mandates."
      );
      setItems(initialItems);
    } else {
      setSelectedCustomerId(preselectedCustomerId || "");
      setIssueDate(new Date().toISOString().split("T")[0]);
      const d = new Date();
      d.setDate(d.getDate() + 15);
      setDueDate(d.toISOString().split("T")[0]);
      setDiscountRupees(0);
      setTaxRate(18);
      setNotes("");
      setTerms(
        "1. Payment due within 15 calendar days from the date of invoice.\n2. Please mention the Invoice Number in your bank transfer or cheque remarks.\n3. GST applied as per Government of India statutory mandates."
      );
      setItems([{ description: "", quantity: 1, unitPriceRupees: 0 }]);
    }
    setErrorMsg(null);
  }, [open, invoiceToEdit, preselectedCustomerId, preselectedQuotation, initialItems]);

  // Real-time calculations in Paise
  const subtotalPaise = React.useMemo(() => {
    return items.reduce((acc, it) => {
      const pricePaise = Math.round(Number(it.unitPriceRupees || 0) * 100);
      return acc + (Number(it.quantity) || 0) * pricePaise;
    }, 0);
  }, [items]);

  const discountPaise = React.useMemo(() => {
    const disc = Math.round(Number(discountRupees || 0) * 100);
    return Math.min(disc, subtotalPaise);
  }, [discountRupees, subtotalPaise]);

  const taxableAmountPaise = Math.max(0, subtotalPaise - discountPaise);
  const taxPaise = Math.round((taxableAmountPaise * taxRate) / 100);
  const totalPaise = taxableAmountPaise + taxPaise;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { description: "", quantity: 1, unitPriceRupees: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof FormLineItem,
    value: string | number
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSelectCatalogService = (index: number, serviceIdStr: string) => {
    const sId = parseInt(serviceIdStr, 10);
    const service = catalogServices.find((s) => s.id === sId);
    if (!service) return;

    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        serviceId: service.id,
        description: service.name,
        unitPriceRupees: Math.round(service.price / 100),
      };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedCustomerId) {
      setErrorMsg("Please select a customer for this invoice.");
      return;
    }

    if (items.some((it) => !it.description.trim())) {
      setErrorMsg("Every line item must have a valid description.");
      return;
    }

    if (items.some((it) => Number(it.quantity) <= 0)) {
      setErrorMsg("Item quantity must be at least 1.");
      return;
    }

    setSubmitting(true);

    try {
      const parsedIssueDate = new Date(issueDate).getTime();
      const parsedDueDate = new Date(dueDate).getTime();

      const payload = {
        customerId: selectedCustomerId,
        quotationId: preselectedQuotation?.id || preselectedQuotationId || invoiceToEdit?.quotationId || null,
        issueDate: isNaN(parsedIssueDate) ? Date.now() : parsedIssueDate,
        dueDate: isNaN(parsedDueDate) ? Date.now() + 15 * 86400000 : parsedDueDate,
        discount: discountPaise,
        taxRate,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        items: items.map((it) => ({
          serviceId: it.serviceId || null,
          description: it.description.trim(),
          quantity: Number(it.quantity) || 1,
          unitPrice: Math.round(Number(it.unitPriceRupees || 0) * 100),
        })),
      };

      const url = invoiceToEdit
        ? `/api/invoices/${invoiceToEdit.id}`
        : "/api/invoices";
      const method = invoiceToEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save invoice.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-stone-900">
            {invoiceToEdit ? "Edit Invoice" : "Create Tax Invoice"}
          </DialogTitle>
          <DialogDescription className="text-stone-500 text-sm">
            Generate an official GST Tax Invoice with itemized billing, taxes, and bank terms.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Customer Selection */}
          <div className="bg-stone-50 p-4 rounded-lg border border-stone-200/80 space-y-3">
            <div className="font-semibold text-stone-800 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Customer Information
            </div>

            {preselectedCustomerId ? (
              <div className="text-sm font-medium text-stone-900 bg-white p-2.5 rounded border border-stone-200">
                Customer: <span className="font-semibold">{preselectedCustomerName || selectedCustomerId}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-600">Select Customer *</label>
                <Select
                  value={selectedCustomerId}
                  onValueChange={(val) => {
                    if (val) setSelectedCustomerId(val);
                  }}
                  disabled={Boolean(invoiceToEdit)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Choose a registered customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customersList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Section: Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-600">Issue Date *</label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                className="bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-600">Payment Due Date *</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="bg-white"
              />
            </div>
          </div>

          {/* Section: Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-stone-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Line Items
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="text-xs h-8 gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => {
                const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPriceRupees) || 0);

                return (
                  <div
                    key={index}
                    className="p-3 bg-white border border-stone-200 rounded-lg shadow-sm space-y-2"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                      {/* Catalog picker */}
                      {catalogServices.length > 0 && (
                        <div className="md:col-span-4">
                          <Select
                            value={item.serviceId ? String(item.serviceId) : undefined}
                            onValueChange={(val) => {
                              if (val) handleSelectCatalogService(index, val);
                            }}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Pick from catalog..." />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogServices.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  {s.name} ({formatINR(s.price)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Description */}
                      <div className={catalogServices.length > 0 ? "md:col-span-8" : "md:col-span-12"}>
                        <Input
                          placeholder="Item or service description *"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          className="h-9 text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-12 gap-2 items-center">
                      <div className="col-span-1 md:col-span-3">
                        <label className="text-[11px] text-stone-500 font-medium">Qty</label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value, 10) || 1)}
                          className="h-8 text-xs"
                          required
                        />
                      </div>

                      <div className="col-span-1 md:col-span-4">
                        <label className="text-[11px] text-stone-500 font-medium">Rate (₹)</label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPriceRupees}
                          onChange={(e) => handleItemChange(index, "unitPriceRupees", parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs"
                          required
                        />
                      </div>

                      <div className="col-span-1 md:col-span-4">
                        <label className="text-[11px] text-stone-500 font-medium">Amount</label>
                        <div className="h-8 flex items-center px-2 text-xs font-semibold text-stone-800 bg-stone-50 rounded border border-stone-200">
                          {formatINR(Math.round(itemTotal * 100))}
                        </div>
                      </div>

                      <div className="col-span-3 md:col-span-1 flex justify-end items-end pt-3 md:pt-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={items.length <= 1}
                          onClick={() => handleRemoveItem(index)}
                          className="h-8 w-8 text-stone-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Adjustments & Calculation Breakdown */}
          <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-600">Discount (₹)</label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={discountRupees}
                  onChange={(e) => setDiscountRupees(parseFloat(e.target.value) || 0)}
                  className="bg-white h-9 text-sm"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-600">GST Tax Rate</label>
                <Select
                  value={String(taxRate)}
                  onValueChange={(val) => {
                    if (val) setTaxRate(parseInt(val, 10));
                  }}
                >
                  <SelectTrigger className="bg-white h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Exempt)</SelectItem>
                    <SelectItem value="5">5% GST (CGST 2.5% + SGST 2.5%)</SelectItem>
                    <SelectItem value="12">12% GST (CGST 6% + SGST 6%)</SelectItem>
                    <SelectItem value="18">18% GST (Standard)</SelectItem>
                    <SelectItem value="28">28% GST (Luxury / Higher)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Calculations Summary Card */}
            <div className="pt-3 border-t border-stone-200/80 space-y-1.5 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatINR(subtotalPaise)}</span>
              </div>
              {discountPaise > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-mono">- {formatINR(discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Taxable Value:</span>
                <span className="font-mono">{formatINR(taxableAmountPaise)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>GST ({taxRate}%):</span>
                <span className="font-mono">{formatINR(taxPaise)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-700">{formatINR(totalPaise)}</span>
              </div>
            </div>
          </div>

          {/* Section: Notes & Terms */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-600">Notes / Remarks</label>
              <Textarea
                placeholder="Internal notes or messages to the customer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white text-xs"
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-600">Payment Terms & Instructions</label>
              <Textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="bg-white text-xs font-mono"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-700 hover:bg-emerald-800 text-white min-w-[120px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : invoiceToEdit ? (
                "Save Changes"
              ) : (
                "Issue Invoice"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
