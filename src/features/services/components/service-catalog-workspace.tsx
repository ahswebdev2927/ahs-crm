"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import {
  Briefcase,
  RefreshCw,
  Plus,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Check,
  Star,
  Info,
  Clock,
  ExternalLink,
  Edit,
  Loader2,
  TrendingUp,
  Layers,
  Sparkles,
} from "lucide-react";
import { ServiceFormDialog } from "./service-form-dialog";
import type { CatalogServiceItem, ServiceKpis } from "../types/service.types";

export function ServiceCatalogWorkspace() {
  const [services, setServices] = useState<CatalogServiceItem[]>([]);
  const [kpis, setKpis] = useState<ServiceKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters & State
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>("all");
  const [cadenceFilter, setCadenceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"matrix" | "table">("matrix");

  // Dialog State
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<CatalogServiceItem | null>(null);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/services?limit=100");
      const data = await res.json();
      if (res.ok && data.data?.services) {
        setServices(data.data.services);
        if (data.data.kpis) {
          setKpis(data.data.kpis);
        }
      } else {
        toast.add({
          type: "error",
          title: "Error",
          description: data.message || "Failed to load service catalog.",
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Connection Error",
        description: "Failed to connect to service catalog API.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleSyncWebsite = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/services/sync", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.data) {
        const { addedCount, updatedCount, totalReceived } = data.data;
        toast.add({
          type: "success",
          title: "Sync Successful",
          description: `${addedCount} plans added, ${updatedCount} updated (${totalReceived} total).`,
        });
        fetchCatalog();
      } else {
        toast.add({
          type: "error",
          title: "Sync Failed",
          description: data.message || "Website sync failed. Check API key configuration.",
        });
      }
    } catch (err: unknown) {
      toast.add({
        type: "error",
        title: "Connection Error",
        description: (err as Error).message || "Connection to website sync failed.",
      });
    } finally {
      setSyncing(false);
    }
  };


  // Category counts
  const categorySummary = useMemo(() => {
    const counts: Record<string, number> = {};
    services.forEach((s) => {
      counts[s.categoryKey] = (counts[s.categoryKey] || 0) + 1;
    });
    return counts;
  }, [services]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      // Category filter
      if (selectedCategoryKey !== "all" && s.categoryKey !== selectedCategoryKey) {
        return false;
      }
      // Cadence filter
      if (cadenceFilter !== "all" && s.billingModel !== cadenceFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(query);
        const matchesCode = s.code.toLowerCase().includes(query);
        const matchesType = s.serviceType.toLowerCase().includes(query);
        const matchesCat = s.category.toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesType && !matchesCat) {
          return false;
        }
      }
      return true;
    });
  }, [services, selectedCategoryKey, cadenceFilter, searchQuery]);

  // Group services by Service Type for Matrix View
  const groupedByServiceType = useMemo(() => {
    const groups = new Map<string, { category: string; categoryKey: string; items: CatalogServiceItem[] }>();

    filteredServices.forEach((s) => {
      if (!groups.has(s.serviceType)) {
        groups.set(s.serviceType, {
          category: s.category,
          categoryKey: s.categoryKey,
          items: [],
        });
      }
      groups.get(s.serviceType)!.items.push(s);
    });

    // Sort items within each group by sortOrder, then price
    groups.forEach((group) => {
      group.items.sort((a, b) => a.sortOrder - b.sortOrder || a.price - b.price);
    });

    return Array.from(groups.entries()).map(([serviceType, data]) => ({
      serviceType,
      category: data.category,
      categoryKey: data.categoryKey,
      plans: data.items,
    }));
  }, [filteredServices]);

  return (
    <div className="flex-1 space-y-4">
      <PageHeader
        title="Service Catalog & Subscriptions"
        description="Standard product packages, tiered retainer matrices, and live public website sync."
        breadcrumbs={[
          { label: "CRM", href: "/dashboard" },
          { label: "Customers", href: "/customers/customers" },
          { label: "Service Catalog" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncWebsite}
              disabled={syncing}
              className="h-8 text-xs cursor-pointer border-border hover:bg-muted"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin text-primary" : ""}`} />
              <span>{syncing ? "Syncing..." : "Sync from Website"}</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingService(null);
                setFormDialogOpen(true);
              }}
              className="h-8 text-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              <span>Add Service Plan</span>
            </Button>
          </div>
        }
      />

      <div className="w-full px-4 sm:px-5 xl:px-6 space-y-4">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border border-border shadow-xs bg-card p-3">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              <span>Catalog Plans</span>
              <Layers className="h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
            <div className="text-xl font-bold text-foreground mt-0.5 tabular-nums">
              {kpis?.totalCatalogPlans ?? services.length}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Across 5 Categories & 11 Types
            </div>
          </Card>

          <Card className="border border-border shadow-xs bg-card p-3">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              <span>Active Subscriptions</span>
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
            <div className="text-xl font-bold text-foreground mt-0.5 tabular-nums">
              {kpis?.activeSubscriptionsCount ?? 0}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <Check className="h-3 w-3" /> Live customer contracts
            </div>
          </Card>

          <Card className="border border-border shadow-xs bg-card p-3">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              <span>Monthly Recurring Revenue</span>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
              ₹{((kpis?.monthlyRecurringRevenue ?? 0) / 100).toLocaleString("en-IN")}/mo
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Active retainers
            </div>
          </Card>

          <Card className="border border-border shadow-xs bg-card p-3">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              <span>Website Sync Status</span>
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
            <div className="text-sm font-semibold text-foreground mt-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {kpis?.lastSyncedAt
                ? `Last: ${new Date(kpis.lastSyncedAt).toLocaleDateString("en-IN")}`
                : "Turso live mirror"}
            </div>
          </Card>
        </div>

        {/* Filters & Control Bar */}
        <div className="space-y-3">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-3">
            <Button
              variant={selectedCategoryKey === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategoryKey("all")}
              className="h-7 text-xs rounded-full cursor-pointer"
            >
              All Categories ({services.length})
            </Button>
            <Button
              variant={selectedCategoryKey === "digital-marketing" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategoryKey("digital-marketing")}
              className="h-7 text-xs rounded-full cursor-pointer"
            >
              Digital Marketing ({categorySummary["digital-marketing"] || 0})
            </Button>
            <Button
              variant={selectedCategoryKey === "websites" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategoryKey("websites")}
              className="h-7 text-xs rounded-full cursor-pointer"
            >
              Websites ({categorySummary["websites"] || 0})
            </Button>
            <Button
              variant={selectedCategoryKey === "app-development" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategoryKey("app-development")}
              className="h-7 text-xs rounded-full cursor-pointer"
            >
              App Development ({categorySummary["app-development"] || 0})
            </Button>
            <Button
              variant={selectedCategoryKey === "video-production" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategoryKey("video-production")}
              className="h-7 text-xs rounded-full cursor-pointer"
            >
              Video Production ({categorySummary["video-production"] || 0})
            </Button>
            <Button
              variant={selectedCategoryKey === "special" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategoryKey("special")}
              className="h-7 text-xs rounded-full cursor-pointer"
            >
              Special / Spa ({categorySummary["special"] || 0})
            </Button>
          </div>

          {/* Sub Controls: Search, Cadence Filter, View Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search plan, SKU code, service type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <select
                value={cadenceFilter}
                onChange={(e) => setCadenceFilter(e.target.value)}
                className="h-8 px-2.5 bg-background border border-input rounded-md text-xs cursor-pointer shrink-0"
              >
                <option value="all">All Cadences</option>
                <option value="monthly">Monthly Retainers</option>
                <option value="one_time">One-Time Projects</option>
              </select>
            </div>

            <div className="flex items-center gap-1 border rounded-md p-0.5 bg-muted/40 shrink-0 self-end sm:self-auto">
              <Button
                variant={viewMode === "matrix" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("matrix")}
                className="h-7 text-xs px-2.5 cursor-pointer"
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Tier Matrix
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-7 text-xs px-2.5 cursor-pointer"
              >
                <TableIcon className="h-3.5 w-3.5 mr-1" /> Table View
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading catalog items...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <Card className="border border-dashed p-12 text-center text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-semibold text-foreground">No matching service plans found</p>
            <p className="text-xs max-w-sm mx-auto mt-1">
              Try adjusting your category filter, cadence selection, or search query.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategoryKey("all");
                setCadenceFilter("all");
                setSearchQuery("");
              }}
              className="mt-3 text-xs"
            >
              Reset Filters
            </Button>
          </Card>
        ) : viewMode === "matrix" ? (
          /* Tier Matrix View (Grouped by Service Type) */
          <div className="space-y-6">
            {groupedByServiceType.map((group) => (
              <div key={group.serviceType} className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2 border-border/80">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-foreground tracking-tight">
                      {group.serviceType}
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {group.category}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {group.plans.length} {group.plans.length === 1 ? "Plan" : "Tiers"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.plans.map((p) => (
                    <Card
                      key={p.id}
                      className={`relative flex flex-col border transition-all duration-200 hover:shadow-md ${
                        p.isPopular
                          ? "border-amber-500/50 dark:border-amber-500/40 shadow-xs ring-1 ring-amber-500/20 bg-amber-500/[0.02]"
                          : "border-border shadow-xs hover:border-primary/40 bg-card"
                      }`}
                    >
                      {p.isPopular && (
                        <div className="absolute -top-2.5 right-4">
                          <Badge className="bg-amber-500 text-white dark:bg-amber-600 text-[10px] font-semibold flex items-center gap-1 shadow-xs">
                            <Star className="h-3 w-3 fill-current" /> Most Popular
                          </Badge>
                        </div>
                      )}

                      <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-sm font-bold text-foreground">
                              {p.plan}
                            </CardTitle>
                            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                              {p.code}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              p.billingModel === "monthly"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px]"
                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px]"
                            }
                          >
                            {p.billingModel === "monthly" ? "Monthly" : "One-Time"}
                          </Badge>
                        </div>

                        {/* Price Block */}
                        <div className="pt-2">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-foreground tabular-nums tracking-tight">
                              ₹{(p.price / 100).toLocaleString("en-IN")}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              {p.billingText || (p.billingModel === "monthly" ? "+ GST/Month" : "+ GST")}
                            </span>
                          </div>
                          {p.note && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-1">
                              <Info className="h-3 w-3 shrink-0" /> {p.note}
                            </p>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="px-4 sm:px-5 pb-4 flex-1 flex flex-col justify-between">
                        {/* Deliverables List */}
                        <div className="space-y-1.5 border-t border-border/60 pt-3">
                          <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                            Included Deliverables ({p.features.length}):
                          </p>
                          <ul className="space-y-1 text-xs text-muted-foreground max-h-48 overflow-y-auto pr-1">
                            {p.features.map((feature, fIdx) => (
                              <li key={fIdx} className="flex items-start gap-1.5 leading-snug">
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="pt-4 mt-auto border-t border-border/40 flex items-center justify-between text-xs">
                          <span className="text-[10px] text-muted-foreground">
                            {p.status === "active" ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                              </span>
                            ) : (
                              <span className="text-zinc-500 font-medium">Inactive</span>
                            )}
                          </span>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingService(p);
                              setFormDialogOpen(true);
                            }}
                            className="h-7 text-xs px-2 cursor-pointer hover:bg-muted"
                          >
                            <Edit className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Catalog Table View */
          <Card className="border border-border shadow-xs bg-card">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">SKU / Code</th>
                    <th className="py-2.5 px-4">Plan Name</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Service Type</th>
                    <th className="py-2.5 px-4">Cadence</th>
                    <th className="py-2.5 px-4 text-right">Price (₹)</th>
                    <th className="py-2.5 px-4 text-center">Popular</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredServices.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-foreground">{p.code}</td>
                      <td className="py-2.5 px-4 font-semibold text-foreground">{p.name}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{p.category}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{p.serviceType}</td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant="outline"
                          className={
                            p.billingModel === "monthly"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px]"
                              : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px]"
                          }
                        >
                          {p.billingModel === "monthly" ? "Monthly" : "One-Time"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-foreground tabular-nums">
                        ₹{(p.price / 100).toLocaleString("en-IN")}{" "}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {p.billingText || ""}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {p.isPopular ? (
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={
                            p.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                              : "text-zinc-500 text-[10px]"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingService(p);
                            setFormDialogOpen(true);
                          }}
                          className="h-7 text-xs px-2 cursor-pointer"
                        >
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <ServiceFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        service={editingService}
        onSuccess={fetchCatalog}
      />
    </div>
  );
}
