"use client";

import * as React from "react";
import { useState, useEffect } from "react";
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
import { Loader2, Plus, X } from "lucide-react";
import type { CatalogServiceItem } from "../types/service.types";


interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: CatalogServiceItem | null;
  onSuccess: () => void;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSuccess,
}: ServiceFormDialogProps) {
  const isEditing = Boolean(service);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("Digital Marketing Packages");
  const [categoryKey, setCategoryKey] = useState("digital-marketing");
  const [serviceType, setServiceType] = useState("Social Media Marketing");
  const [plan, setPlan] = useState("Basic Plan");
  const [billingModel, setBillingModel] = useState<"monthly" | "one_time">("monthly");
  const [billingText, setBillingText] = useState("+ GST/Month");
  const [priceRupees, setPriceRupees] = useState("");
  const [note, setNote] = useState("");
  const [isPopular, setIsPopular] = useState(false);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [sortOrder, setSortOrder] = useState("0");
  const [featureInput, setFeatureInput] = useState("");
  const [featuresList, setFeaturesList] = useState<string[]>([]);

  useEffect(() => {
    if (service) {
      setName(service.name);
      setCode(service.code);
      setCategory(service.category);
      setCategoryKey(service.categoryKey);
      setServiceType(service.serviceType);
      setPlan(service.plan);
      setBillingModel(service.billingModel);
      setBillingText(service.billingText || (service.billingModel === "monthly" ? "+ GST/Month" : "+ GST"));
      setPriceRupees(String(Math.round(service.price / 100)));
      setNote(service.note || "");
      setIsPopular(service.isPopular);
      setStatus(service.status);
      setSortOrder(String(service.sortOrder));
      setFeaturesList(service.features || []);
    } else {
      setName("");
      setCode("");
      setCategory("Digital Marketing Packages");
      setCategoryKey("digital-marketing");
      setServiceType("Social Media Marketing");
      setPlan("Basic Plan");
      setBillingModel("monthly");
      setBillingText("+ GST/Month");
      setPriceRupees("");
      setNote("");
      setIsPopular(false);
      setStatus("active");
      setSortOrder("0");
      setFeaturesList([]);
    }
  }, [service, open]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    const keyMap: Record<string, string> = {
      "Digital Marketing Packages": "digital-marketing",
      "Website Packages": "websites",
      "App Development Packages": "app-development",
      "Video Production": "video-production",
      "Special Packages": "special",
    };
    setCategoryKey(keyMap[cat] || cat.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  };

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFeaturesList([...featuresList, featureInput.trim()]);
      setFeatureInput("");
    }
  };

  const handleRemoveFeature = (idx: number) => {
    setFeaturesList(featuresList.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !priceRupees) {
      toast.add({
        type: "error",
        title: "Validation Error",
        description: "Please fill in required fields (Name, Code, Price).",
      });
      return;
    }

    const pricePaise = Math.round(parseFloat(priceRupees) * 100);
    if (isNaN(pricePaise) || pricePaise < 0) {
      toast.add({
        type: "error",
        title: "Validation Error",
        description: "Please enter a valid price in Rupees.",
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        category,
        categoryKey,
        serviceType: serviceType.trim(),
        plan: plan.trim(),
        billingModel,
        billingText: billingText.trim() || null,
        price: pricePaise,
        priceText: `₹${parseFloat(priceRupees).toLocaleString("en-IN")}`,
        note: note.trim() || null,
        isPopular,
        sortOrder: parseInt(sortOrder, 10) || 0,
        status,
        features: featuresList,
      };

      const url = isEditing ? `/api/services/${service!.id}` : "/api/services";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save service.");
      }

      toast.add({
        type: "success",
        title: "Service Saved",
        description: isEditing ? "Service plan updated successfully." : "Service plan created successfully.",
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
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Service Plan" : "Add Service Plan"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update pricing, deliverables, or visibility for this catalog service."
              : "Create a new purchasable service package or retainer tier in the CRM catalog."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="service-name" className="text-xs font-medium">
                Plan Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="service-name"
                placeholder="e.g. Social Media Marketing - Basic Plan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="service-code" className="text-xs font-medium">
                SKU / Code <span className="text-destructive">*</span>
              </label>
              <Input
                id="service-code"
                placeholder="e.g. DM-SMM-BASIC"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="category-select" className="text-xs font-medium">Category</label>
              <select
                id="category-select"
                className="w-full h-9 px-3 py-1 bg-background border border-input rounded-md text-xs"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                <option value="Digital Marketing Packages">Digital Marketing Packages</option>
                <option value="Website Packages">Website Packages</option>
                <option value="App Development Packages">App Development Packages</option>
                <option value="Video Production">Video Production</option>
                <option value="Special Packages">Special Packages</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="service-type" className="text-xs font-medium">Service Type</label>
              <Input
                id="service-type"
                placeholder="e.g. Social Media Marketing"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="plan-name" className="text-xs font-medium">Tier / Plan</label>
              <Input
                id="plan-name"
                placeholder="e.g. Basic Plan, Standard Plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="billing-model" className="text-xs font-medium">Billing Model</label>
              <select
                id="billing-model"
                className="w-full h-9 px-3 py-1 bg-background border border-input rounded-md text-xs"
                value={billingModel}
                onChange={(e) => {
                  const m = e.target.value as "monthly" | "one_time";
                  setBillingModel(m);
                  setBillingText(m === "monthly" ? "+ GST/Month" : "+ GST");
                }}
              >
                <option value="monthly">Monthly Retainer</option>
                <option value="one_time">One-Time Project</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="price-rupees" className="text-xs font-medium">
                Price (₹) <span className="text-destructive">*</span>
              </label>
              <Input
                id="price-rupees"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 16999"
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="billing-text" className="text-xs font-medium">Billing Note / GST</label>
              <Input
                id="billing-text"
                placeholder="e.g. + GST/Month"
                value={billingText}
                onChange={(e) => setBillingText(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="status-select" className="text-xs font-medium">Status</label>
              <select
                id="status-select"
                className="w-full h-9 px-3 py-1 bg-background border border-input rounded-md text-xs"
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive / Archived</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sort-order" className="text-xs font-medium">Sort Order</label>
              <Input
                id="sort-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is-popular-checkbox"
                checked={isPopular}
                onChange={(e) => setIsPopular(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="is-popular-checkbox" className="text-xs cursor-pointer font-medium">
                Mark as Popular
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="service-note" className="text-xs font-medium">Plan Context Note (Optional)</label>
            <Input
              id="service-note"
              placeholder="e.g. Campaign charge not included."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="space-y-2 border-t pt-3 border-border">
            <label className="text-xs font-medium">Deliverables / Features Checklist</label>
            <div className="flex gap-2">
              <Input
                placeholder="Add feature deliverable item..."
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
                className="text-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddFeature}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            {featuresList.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1 border rounded-md p-2 bg-muted/20">
                {featuresList.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background border border-border/60"
                  >
                    <span className="truncate pr-2">• {f}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(idx)}
                      className="text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
