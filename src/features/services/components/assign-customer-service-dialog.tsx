"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
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
import { toast } from "@/components/ui/toast";

import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import type { CatalogServiceItem } from "../types/service.types";

interface AssignCustomerServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName?: string;
  onSuccess: () => void;
}

export function AssignCustomerServiceDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  onSuccess,
}: AssignCustomerServiceDialogProps) {
  const [catalog, setCatalog] = useState<CatalogServiceItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Cascading selections
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>("");
  const [selectedServiceType, setSelectedServiceType] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<number | "">("");

  // Commercial terms
  const [agreedPriceRupees, setAgreedPriceRupees] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (open) {
      setLoadingCatalog(true);
      fetch("/api/services?limit=100&status=active")
        .then(async (res) => {
          const data = await res.json();
          if (res.ok && (data.data?.services || Array.isArray(data.data?.items))) {
            const items: CatalogServiceItem[] = data.data.services || data.data.items || [];
            setCatalog(items);
            if (items.length > 0) {
              const first = items[0];
              setSelectedCategoryKey(first.categoryKey);
              setSelectedServiceType(first.serviceType);
              setSelectedServiceId(first.id);
              setAgreedPriceRupees(String(Math.round(first.price / 100)));
            } else {
              setSelectedCategoryKey("");
              setSelectedServiceType("");
              setSelectedServiceId("");
              setAgreedPriceRupees("");
            }
          } else {
            toast.add({
              type: "error",
              title: "Error",
              description: data.message || "Failed to load active catalog services.",
            });
          }
        })
        .catch(() =>
          toast.add({
            type: "error",
            title: "Connection Error",
            description: "Failed to load active catalog services.",
          })
        )
        .finally(() => setLoadingCatalog(false));
    }
  }, [open]);


  // Derived category options
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    catalog.forEach((s) => map.set(s.categoryKey, s.category));
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [catalog]);

  // Derived service types for selected category
  const serviceTypeOptions = useMemo(() => {
    if (!selectedCategoryKey) return [];
    const types = new Set<string>();
    catalog
      .filter((s) => s.categoryKey === selectedCategoryKey)
      .forEach((s) => types.add(s.serviceType));
    return Array.from(types);
  }, [catalog, selectedCategoryKey]);

  // Derived plans for selected service type
  const planOptions = useMemo(() => {
    if (!selectedCategoryKey || !selectedServiceType) return [];
    return catalog.filter(
      (s) =>
        s.categoryKey === selectedCategoryKey &&
        s.serviceType === selectedServiceType
    );
  }, [catalog, selectedCategoryKey, selectedServiceType]);

  // Active selected service item
  const selectedService = useMemo(() => {
    return catalog.find((s) => s.id === selectedServiceId) || null;
  }, [catalog, selectedServiceId]);

  // Handle Category selection change
  const handleCategoryChange = (catKey: string) => {
    setSelectedCategoryKey(catKey);
    const matchingTypes = Array.from(
      new Set(
        catalog
          .filter((s) => s.categoryKey === catKey)
          .map((s) => s.serviceType)
      )
    );
    const nextType = matchingTypes[0] || "";
    setSelectedServiceType(nextType);

    const nextPlans = catalog.filter(
      (s) => s.categoryKey === catKey && s.serviceType === nextType
    );
    if (nextPlans.length > 0) {
      setSelectedServiceId(nextPlans[0].id);
      setAgreedPriceRupees(String(Math.round(nextPlans[0].price / 100)));
    } else {
      setSelectedServiceId("");
      setAgreedPriceRupees("");
    }
  };

  // Handle Service Type selection change
  const handleServiceTypeChange = (type: string) => {
    setSelectedServiceType(type);
    const nextPlans = catalog.filter(
      (s) =>
        s.categoryKey === selectedCategoryKey && s.serviceType === type
    );
    if (nextPlans.length > 0) {
      setSelectedServiceId(nextPlans[0].id);
      setAgreedPriceRupees(String(Math.round(nextPlans[0].price / 100)));
    } else {
      setSelectedServiceId("");
      setAgreedPriceRupees("");
    }
  };

  // Handle Plan selection change
  const handlePlanChange = (svcId: number) => {
    setSelectedServiceId(svcId);
    const target = catalog.find((s) => s.id === svcId);
    if (target) {
      setAgreedPriceRupees(String(Math.round(target.price / 100)));
    }
  };

  // Computed total calculation
  const computedTotalRupees = useMemo(() => {
    const unitPrice = parseFloat(agreedPriceRupees) || 0;
    return unitPrice * (quantity > 0 ? quantity : 1);
  }, [agreedPriceRupees, quantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId || !agreedPriceRupees) {
      toast.add({
        type: "error",
        title: "Validation Error",
        description: "Please select a service plan and confirm agreed price.",
      });
      return;
    }

    const pricePaise = Math.round(parseFloat(agreedPriceRupees) * 100);
    if (isNaN(pricePaise) || pricePaise < 0) {
      toast.add({
        type: "error",
        title: "Validation Error",
        description: "Invalid price entered.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: Number(selectedServiceId),
          quantity,
          price: pricePaise,
          startDate: new Date(startDate).toISOString(),
          endDate: endDate ? new Date(endDate).toISOString() : null,
          notes: notes.trim() || null,
          status: "active",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to assign service.");
      }

      toast.add({
        type: "success",
        title: "Assigned",
        description: "Service subscription assigned successfully.",
      });
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.add({
        type: "error",
        title: "Error",
        description: (err as Error).message || "An unexpected error occurred.",
      });
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Service Contract</DialogTitle>
          <DialogDescription>
            {customerName
              ? `Select and assign a package or monthly retainer plan for ${customerName}.`
              : "Select and assign a package or monthly retainer plan."}
          </DialogDescription>
        </DialogHeader>

        {loadingCatalog ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Loading service catalog...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {catalog.length === 0 ? (
              <div className="p-4 rounded-lg border border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-semibold">No active services found in catalog.</p>
                <p className="text-[11px] text-muted-foreground">
                  Please open the Service Catalog and click &quot;Sync from Website&quot; or create a service plan first.
                </p>
              </div>
            ) : (
              /* 3-Level Cascading Selector */
              <div className="space-y-3 p-3 rounded-lg border border-border/70 bg-muted/20">
                <div className="space-y-1.5">
                  <label htmlFor="cat-select" className="text-xs font-medium text-foreground">
                    1. Service Category
                  </label>
                  <select
                    id="cat-select"
                    className="w-full h-9 px-3 py-1 bg-background text-foreground border border-input rounded-md text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring [&>option]:bg-card [&>option]:text-foreground"
                    value={selectedCategoryKey}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    {categoryOptions.length === 0 && (
                      <option value="">No categories available</option>
                    )}
                    {categoryOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="type-select" className="text-xs font-medium text-foreground">
                    2. Service Type
                  </label>
                  <select
                    id="type-select"
                    className="w-full h-9 px-3 py-1 bg-background text-foreground border border-input rounded-md text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring [&>option]:bg-card [&>option]:text-foreground"
                    value={selectedServiceType}
                    onChange={(e) => handleServiceTypeChange(e.target.value)}
                  >
                    {serviceTypeOptions.length === 0 && (
                      <option value="">No service types for category</option>
                    )}
                    {serviceTypeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="plan-select" className="text-xs font-medium text-foreground">
                    3. Plan / Package Tier
                  </label>
                  <select
                    id="plan-select"
                    className="w-full h-9 px-3 py-1 bg-background text-foreground border border-input rounded-md text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring [&>option]:bg-card [&>option]:text-foreground"
                    value={selectedServiceId}
                    onChange={(e) => handlePlanChange(Number(e.target.value))}
                  >
                    {planOptions.length === 0 && (
                      <option value="">No plans for selected type</option>
                    )}
                    {planOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.plan} — ₹{(p.price / 100).toLocaleString("en-IN")}{" "}
                        {p.billingModel === "monthly" ? "/mo" : " (One-time)"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}


            {/* Catalog Price Snapshot Preview */}
            {selectedService && (
              <div className="p-3 rounded-md bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-medium text-foreground">
                  <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                    <ShieldCheck className="h-4 w-4" />
                    Catalog Default Rate:
                  </span>
                  <span className="font-semibold tabular-nums">
                    ₹{(selectedService.price / 100).toLocaleString("en-IN")}{" "}
                    {selectedService.billingText || (selectedService.billingModel === "monthly" ? "+ GST/Month" : "+ GST")}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cadence:{" "}
                  <span className="capitalize font-medium text-foreground">
                    {selectedService.billingModel === "monthly" ? "Monthly Retainer" : "One-Time Project"}
                  </span>
                  {selectedService.note && ` • Note: ${selectedService.note}`}
                </p>
                {selectedService.features.length > 0 && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    Deliverables: {selectedService.features.slice(0, 3).join(", ")}
                    {selectedService.features.length > 3 && ` (+${selectedService.features.length - 3} more)`}
                  </p>
                )}
              </div>
            )}

            {/* Commercial Terms (Negotiated Price & Quantity) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="agreed-price" className="text-xs font-medium">
                  Agreed Unit Price (₹) <span className="text-destructive">*</span>
                </label>
                <Input
                  id="agreed-price"
                  type="number"
                  min="0"
                  step="1"
                  value={agreedPriceRupees}
                  onChange={(e) => setAgreedPriceRupees(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="qty-input" className="text-xs font-medium">
                  Quantity
                </label>
                <Input
                  id="qty-input"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                  required
                />
              </div>
            </div>

            {/* Real-time Total Preview */}
            <div className="flex items-center justify-between p-2.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-border text-xs">
              <span className="text-muted-foreground">Total Contract Value:</span>
              <span className="text-base font-bold text-foreground tabular-nums">
                ₹{computedTotalRupees.toLocaleString("en-IN")}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {selectedService?.billingModel === "monthly" ? "/month" : ""}
                </span>
              </span>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="start-date" className="text-xs font-medium">
                  Start Date <span className="text-destructive">*</span>
                </label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="end-date" className="text-xs font-medium">
                  End / Renewal Date (Optional)
                </label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label htmlFor="notes-area" className="text-xs font-medium">
                Contract Notes & Approval
              </label>
              <Textarea
                id="notes-area"
                rows={2}
                placeholder="e.g. Special multi-quarter discount approved by manager. Kickoff next Monday."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Confirm Assignment
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
