"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  FileText,
  Calculator,
  Calendar,
  Building2,
  User,
  Percent,
  Layers,
  Sparkles,
} from "lucide-react";
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
import type { QuotationDetail } from "../types/quotation.types";

interface QuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteToEdit?: QuotationDetail | null;
  preselectedLeadId?: string;
  preselectedCustomerId?: string;
  preselectedClientName?: string;
  onSuccess: () => void;
}

interface FormLineItem {
  serviceId?: number;
  description: string;
  quantity: number;
  unitPriceRupees: number; // in Rupees for user input
}

export function QuotationDialog({
  open,
  onOpenChange,
  quoteToEdit,
  preselectedLeadId,
  preselectedCustomerId,
  preselectedClientName,
  onSuccess,
}: QuotationDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Client Selection
  const [targetType, setTargetType] = React.useState<"lead" | "customer">(
    preselectedCustomerId ? "customer" : "lead"
  );
  const [selectedClientId, setSelectedClientId] = React.useState<string>(
    preselectedCustomerId || preselectedLeadId || ""
  );

  // Client dropdown options
  const [leadsList, setLeadsList] = React.useState<{ id: string; name: string; company?: string }[]>([]);
  const [customersList, setCustomersList] = React.useState<{ id: string; name: string; company?: string }[]>([]);
  const [catalogServices, setCatalogServices] = React.useState<{ id: number; name: string; price: number }[]>([]);

  // Form State
  const [items, setItems] = React.useState<FormLineItem[]>([
    { description: "", quantity: 1, unitPriceRupees: 0 },
  ]);
  const [discountRupees, setDiscountRupees] = React.useState<number>(0);
  const [taxRate, setTaxRate] = React.useState<number>(18);
  const [validUntilDays, setValidUntilDays] = React.useState<number>(15);
  const [notes, setNotes] = React.useState<string>("");
  const [terms, setTerms] = React.useState<string>(
    "1. Quotation validity: 15 calendar days.\n2. Payment terms: 50% advance upon contract signing, 50% on project delivery.\n3. Taxes: Goods and Services Tax (GST) applied as per statutory regulations."
  );

  // Load clients and services catalog on open
  React.useEffect(() => {
    if (!open) return;

    const fetchInitialData = async () => {
      try {
        const [servicesRes, leadsRes, customersRes] = await Promise.all([
          fetch("/api/services?status=active&limit=100"),
          !preselectedLeadId && !preselectedCustomerId ? fetch("/api/leads?limit=50") : null,
          !preselectedLeadId && !preselectedCustomerId ? fetch("/api/customers?status=active&limit=50") : null,
        ]);

        if (servicesRes.ok) {
          const data = await servicesRes.json();
          if (data?.data?.items) {
            setCatalogServices(data.data.items);
          }
        }

        if (leadsRes && leadsRes.ok) {
          const lData = await leadsRes.json();
          if (lData?.data?.items) {
            setLeadsList(
              lData.data.items.map((it: { id: string; name: string; company?: string }) => ({
                id: it.id,
                name: it.name,
                company: it.company,
              }))
            );
          }
        }

        if (customersRes && customersRes.ok) {
          const cData = await customersRes.json();
          if (cData?.data?.items) {
            setCustomersList(
              cData.data.items.map((it: { id: string; name: string; company?: string }) => ({
                id: it.id,
                name: it.name,
                company: it.company,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Failed to load quotation form dependencies:", err);
      }
    };

    fetchInitialData();
  }, [open, preselectedLeadId, preselectedCustomerId]);

  // Reset or Populate form on open/edit
  React.useEffect(() => {
    if (!open) return;

    if (quoteToEdit) {
      if (quoteToEdit.customerId) {
        setTargetType("customer");
        setSelectedClientId(quoteToEdit.customerId);
      } else if (quoteToEdit.leadId) {
        setTargetType("lead");
        setSelectedClientId(quoteToEdit.leadId);
      }

      setDiscountRupees(quoteToEdit.discount / 100);

      // Estimate tax rate from existing amounts
      const netTaxable = quoteToEdit.subtotal - quoteToEdit.discount;
      if (netTaxable > 0 && quoteToEdit.tax > 0) {
        const calculatedRate = Math.round((quoteToEdit.tax / netTaxable) * 100);
        setTaxRate(calculatedRate);
      } else {
        setTaxRate(18);
      }

      // Calculate days remaining or original validity
      const diffMs = quoteToEdit.validUntil - quoteToEdit.createdAt;
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      setValidUntilDays(diffDays > 45 ? 60 : diffDays > 20 ? 30 : diffDays > 10 ? 15 : 7);

      setNotes(quoteToEdit.notes || "");
      setTerms(
        quoteToEdit.terms ||
          "1. Quotation validity: 15 calendar days.\n2. Payment terms: 50% advance upon contract signing, 50% on project delivery.\n3. Taxes: Goods and Services Tax (GST) applied as per statutory regulations."
      );

      if (quoteToEdit.items && quoteToEdit.items.length > 0) {
        setItems(
          quoteToEdit.items.map((item) => ({
            serviceId: item.serviceId || undefined,
            description: item.description,
            quantity: item.quantity,
            unitPriceRupees: item.unitPrice / 100, // paise to INR
          }))
        );
      } else {
        setItems([{ description: "", quantity: 1, unitPriceRupees: 0 }]);
      }
    } else {
      // Create new mode
      if (preselectedCustomerId) {
        setTargetType("customer");
        setSelectedClientId(preselectedCustomerId);
      } else if (preselectedLeadId) {
        setTargetType("lead");
        setSelectedClientId(preselectedLeadId);
      } else {
        setTargetType("lead");
        setSelectedClientId("");
      }

      setItems([{ description: "", quantity: 1, unitPriceRupees: 0 }]);
      setDiscountRupees(0);
      setTaxRate(18);
      setValidUntilDays(15);
      setNotes("");
      setTerms(
        "1. Quotation validity: 15 calendar days.\n2. Payment terms: 50% advance upon contract signing, 50% on project delivery.\n3. Taxes: Goods and Services Tax (GST) applied as per statutory regulations."
      );
      setErrorMsg(null);
    }
  }, [quoteToEdit, open, preselectedLeadId, preselectedCustomerId]);

  // Financial Computations in real-time
  const subtotalPaise = React.useMemo(() => {
    return items.reduce((acc, item) => {
      const linePaise = Math.round((item.quantity || 1) * (item.unitPriceRupees || 0) * 100);
      return acc + linePaise;
    }, 0);
  }, [items]);

  const discountPaise = React.useMemo(() => {
    return Math.min(subtotalPaise, Math.round((discountRupees || 0) * 100));
  }, [subtotalPaise, discountRupees]);

  const taxablePaise = React.useMemo(() => {
    return Math.max(0, subtotalPaise - discountPaise);
  }, [subtotalPaise, discountPaise]);

  const taxPaise = React.useMemo(() => {
    return Math.round((taxablePaise * taxRate) / 100);
  }, [taxablePaise, taxRate]);

  const grandTotalPaise = React.useMemo(() => {
    return taxablePaise + taxPaise;
  }, [taxablePaise, taxRate, taxPaise]);

  // Line item handlers
  const handleAddItem = () => {
    setItems((prev) => [...prev, { description: "", quantity: 1, unitPriceRupees: 0 }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCatalogSelect = (idx: number, serviceIdStr: string) => {
    const sId = parseInt(serviceIdStr, 10);
    const service = catalogServices.find((s) => s.id === sId);
    if (!service) return;

    setItems((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              serviceId: service.id,
              description: service.name,
              unitPriceRupees: service.price / 100, // paise to INR
            }
          : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clientId = selectedClientId || preselectedCustomerId || preselectedLeadId;
    if (!clientId) {
      setErrorMsg(`Please select a ${targetType === "customer" ? "Customer" : "Lead"} for this quotation.`);
      return;
    }

    // Validate line items
    const invalidItem = items.find(
      (i) => !i.description.trim() || Number(i.quantity) < 1 || Number(i.unitPriceRupees) < 0
    );
    if (invalidItem) {
      setErrorMsg("All line items must have a valid description, quantity of at least 1, and a non-negative rate.");
      return;
    }

    setSubmitting(true);

    try {
      const validUntilDate = Date.now() + validUntilDays * 24 * 60 * 60 * 1000;
      const payload = {
        leadId: targetType === "lead" ? clientId : undefined,
        customerId: targetType === "customer" ? clientId : undefined,
        validUntil: validUntilDate,
        discount: discountPaise,
        taxRate,
        notes: notes.trim() || undefined,
        terms: terms.trim() || undefined,
        items: items.map((i) => ({
          serviceId: i.serviceId,
          description: i.description.trim(),
          quantity: Number(i.quantity) || 1,
          unitPrice: Math.round(Number(i.unitPriceRupees || 0) * 100),
        })),
      };

      const url = quoteToEdit ? `/api/quotations/${quoteToEdit.id}` : "/api/quotations";
      const method = quoteToEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save quotation.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred while saving.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border border-border shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border bg-card/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                {quoteToEdit ? `Edit Quotation ${quoteToEdit.quoteNumber}` : "Create Commercial Quotation"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Draft an itemized commercial proposal with catalog services, volume discounts, and GST calculations.
              </DialogDescription>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {quoteToEdit ? quoteToEdit.status.toUpperCase() : "PROPOSAL DRAFT"}
            </span>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {errorMsg && (
            <div className="flex items-center gap-2.5 p-3.5 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Client & Context Selection */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
            {!preselectedLeadId && !preselectedCustomerId && !quoteToEdit ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Prospect Type
                  </label>
                  <Select
                    value={targetType}
                    onValueChange={(val) => {
                      if (val === "lead" || val === "customer") {
                        setTargetType(val);
                        setSelectedClientId("");
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Sales Lead</SelectItem>
                      <SelectItem value="customer">Existing Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-6 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Select {targetType === "lead" ? "Sales Lead" : "Customer"}
                  </label>
                  <Select
                    value={selectedClientId}
                    onValueChange={(val) => {
                      if (val) setSelectedClientId(val);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder={`Select ${targetType === "lead" ? "lead" : "customer"}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {targetType === "lead"
                        ? leadsList.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name} {l.company ? `(${l.company})` : ""}
                            </SelectItem>
                          ))
                        : customersList.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} {c.company ? `(${c.company})` : ""}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Validity Period
                  </label>
                  <Select
                    value={String(validUntilDays)}
                    onValueChange={(val) => {
                      if (val) setValidUntilDays(parseInt(val, 10));
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="15">15 Days (Standard)</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="60">60 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Prepared For Client
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {preselectedClientName ||
                        quoteToEdit?.customer?.name ||
                        quoteToEdit?.lead?.name ||
                        "Selected Client"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Offer Validity
                    </label>
                    <Select
                      value={String(validUntilDays)}
                      onValueChange={(val) => {
                        if (val) setValidUntilDays(parseInt(val, 10));
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="15">15 Days (Standard)</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="60">60 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {quoteToEdit && (
                    <div className="text-right">
                      <div className="text-[11px] font-medium text-muted-foreground">Quote Number</div>
                      <div className="font-mono font-semibold text-foreground">{quoteToEdit.quoteNumber}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Deliverables & Scope Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Deliverables & Commercial Line Items
                </h3>
                <p className="text-xs text-muted-foreground">
                  Specify services, quantities, and agreed unit rates. All amounts are calculated in INR.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-8 text-xs font-medium cursor-pointer shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1 text-primary" />
                Add Line Item
              </Button>
            </div>

            {/* Table Container */}
            <div className="rounded-xl border border-border overflow-hidden bg-card shadow-2xs">
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2.5 bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-5">Service / Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Unit Rate (₹)</div>
                <div className="col-span-2 text-right">Amount (₹)</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-border/60">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 sm:px-4 sm:py-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center hover:bg-muted/10 transition-colors"
                  >
                    {/* Index */}
                    <div className="hidden sm:flex col-span-1 justify-center">
                      <span className="h-6 w-6 rounded-full bg-muted/50 border border-border/80 flex items-center justify-center text-xs font-mono font-medium text-muted-foreground">
                        {idx + 1}
                      </span>
                    </div>

                    {/* Service & Description */}
                    <div className="col-span-1 sm:col-span-5 space-y-1.5">
                      {catalogServices.length > 0 && !item.serviceId && (
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-primary shrink-0" />
                          <Select onValueChange={(val) => handleCatalogSelect(idx, val)}>
                            <SelectTrigger className="h-7 text-[11px] text-muted-foreground bg-muted/30 border-dashed hover:border-primary/50">
                              <SelectValue placeholder="Quick fill from Service Catalog..." />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogServices.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  {s.name} — {formatINR(s.price)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <Input
                        placeholder="Deliverable description or scope details..."
                        value={item.description}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it))
                          )
                        }
                        className="h-8 text-xs bg-background"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-1 sm:col-span-2">
                      <label className="text-[10px] text-muted-foreground font-medium block mb-1 sm:hidden">
                        Quantity
                      </label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) } : it
                            )
                          )
                        }
                        className="h-8 text-xs text-center font-mono bg-background"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-1 sm:col-span-2">
                      <label className="text-[10px] text-muted-foreground font-medium block mb-1 sm:hidden">
                        Unit Rate (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                          ₹
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="100"
                          placeholder="0"
                          value={item.unitPriceRupees || ""}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, unitPriceRupees: parseFloat(e.target.value) || 0 } : it
                              )
                            )
                          }
                          className="pl-6 h-8 text-xs text-right font-mono bg-background"
                        />
                      </div>
                    </div>

                    {/* Line Total & Remove Action */}
                    <div className="col-span-1 sm:col-span-2 flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                      <span className="text-xs text-muted-foreground sm:hidden">Line Total:</span>
                      <span className="font-mono font-bold text-foreground text-xs">
                        {formatINR(Math.round((item.quantity || 1) * (item.unitPriceRupees || 0) * 100))}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        title="Remove deliverable"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table Footer Action */}
              <div className="px-4 py-2.5 bg-muted/20 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "deliverable item" : "deliverable items"} added
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-7 text-xs text-primary font-medium cursor-pointer"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add another item
                </Button>
              </div>
            </div>
          </div>

          {/* Section 3: Commercial Terms & Split Financial Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Discounts & Commercial Clauses (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-2xs">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-primary" />
                  Commercial Adjustments
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-medium text-foreground block mb-1">
                      Commercial Discount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                        ₹
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="0"
                        value={discountRupees || ""}
                        onChange={(e) => setDiscountRupees(parseFloat(e.target.value) || 0)}
                        className="pl-6 h-9 text-xs font-mono bg-background"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      Subtracted from subtotal before tax calculation.
                    </span>
                  </div>

                  <div>
                    <label className="font-medium text-foreground block mb-1">
                      Applicable GST Tax Rate
                    </label>
                    <Select
                      value={String(taxRate)}
                      onValueChange={(val) => {
                        if (val) setTaxRate(parseFloat(val));
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0% (Nil / Exempted)</SelectItem>
                        <SelectItem value="5">5% GST (Reduced)</SelectItem>
                        <SelectItem value="12">12% GST (Concessional)</SelectItem>
                        <SelectItem value="18">18% Standard GST (Services)</SelectItem>
                        <SelectItem value="28">28% GST (Highest)</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      Standard Indian statutory tax for services is 18%.
                    </span>
                  </div>
                </div>
              </div>

              {/* Commercial Terms & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground flex items-center justify-between">
                    <span>Commercial Terms & Scope</span>
                    <span className="text-[10px] font-normal text-muted-foreground">Appears on Quote</span>
                  </label>
                  <Textarea
                    rows={4}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Quotation validity, advance payments, and deliverables terms..."
                    className="text-xs resize-none bg-background leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground flex items-center justify-between">
                    <span>Internal Notes</span>
                    <span className="text-[10px] font-normal text-muted-foreground">Private to Team</span>
                  </label>
                  <Textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal margin rationale, approved exceptions, or special handling notes..."
                    className="text-xs resize-none bg-background leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Right: Authoritative Quotation Summary Card (5 cols) */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-border bg-gradient-to-b from-card to-muted/30 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Calculator className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Commercial Summary
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">INR (Paise Authority)</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Itemized Subtotal:</span>
                    <span className="font-mono font-medium text-foreground">{formatINR(subtotalPaise)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Commercial Discount:</span>
                    <span
                      className={`font-mono font-medium ${
                        discountPaise > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      }`}
                    >
                      {discountPaise > 0 ? `- ${formatINR(discountPaise)}` : "₹0.00"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Taxable Base Value:</span>
                    <span className="font-mono font-medium text-foreground">{formatINR(taxablePaise)}</span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>
                      Statutory GST ({taxRate}%):
                      {taxRate === 18 && (
                        <span className="block text-[10px] text-muted-foreground/80 font-normal">
                          CGST (9%) + SGST (9%)
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-medium text-foreground">{formatINR(taxPaise)}</span>
                  </div>
                </div>

                {/* Grand Total Highlight */}
                <div className="border-t-2 border-dashed border-border pt-4 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Total Payable:
                    </span>
                    <span className="text-2xl font-extrabold tracking-tight text-primary font-mono">
                      {formatINR(grandTotalPaise)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">
                    Includes all applicable taxes • Invoiced in INR (₹)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pinned Modal Footer */}
        <div className="px-6 py-3.5 border-t border-border bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground">
            Total Quotation: <strong className="font-mono text-foreground">{formatINR(grandTotalPaise)}</strong>{" "}
            ({items.length} {items.length === 1 ? "deliverable" : "deliverables"})
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
              className="text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {quoteToEdit ? "Save Changes" : "Create Commercial Quotation"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
