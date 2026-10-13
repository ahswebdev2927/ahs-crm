"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import {
  Briefcase,
  Plus,
  RefreshCw,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
} from "lucide-react";
import { AssignCustomerServiceDialog } from "./assign-customer-service-dialog";
import type { CustomerServiceSubscriptionItem } from "../types/service.types";

interface CustomerServicesTabProps {
  customerId: string;
  customerName?: string;
  onSubscriptionChange?: () => void;
}

export function CustomerServicesTab({
  customerId,
  customerName,
  onSubscriptionChange,
}: CustomerServicesTabProps) {
  const [subscriptions, setSubscriptions] = useState<CustomerServiceSubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/services`);
      const data = await res.json();
      if (res.ok && data.data?.subscriptions) {
        setSubscriptions(data.data.subscriptions);
      } else {
        toast.add({
          type: "error",
          title: "Error",
          description: data.message || "Failed to load customer services.",
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Connection Error",
        description: "Failed to connect to services API.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [customerId]);

  const handleStatusChange = async (
    assignmentId: string,
    newStatus: "active" | "suspended" | "cancelled" | "expired"
  ) => {
    setUpdatingId(assignmentId);
    try {
      const res = await fetch(`/api/customers/${customerId}/services/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.add({
          type: "success",
          title: "Status Updated",
          description: `Service status updated to ${newStatus}.`,
        });
        fetchSubscriptions();
        onSubscriptionChange?.();
      } else {
        toast.add({
          type: "error",
          title: "Update Failed",
          description: data.message || "Failed to update status.",
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Error",
        description: "Error updating status.",
      });
    } finally {
      setUpdatingId(null);
    }
  };


  // Metrics
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const monthlyTotal = activeSubs
    .filter((s) => s.billingModel === "monthly")
    .reduce((sum, s) => sum + s.totalPrice, 0);
  const oneTimeTotal = activeSubs
    .filter((s) => s.billingModel === "one_time")
    .reduce((sum, s) => sum + s.totalPrice, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Active</Badge>;
      case "suspended":
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Suspended</Badge>;
      case "expired":
        return <Badge className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20">Expired</Badge>;
      case "cancelled":
        return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border border-border shadow-xs bg-card p-3">
          <div className="text-[11px] font-medium text-muted-foreground">Active Contracts</div>
          <div className="text-xl font-bold text-foreground mt-0.5 tabular-nums">
            {activeSubs.length}
          </div>
        </Card>
        <Card className="border border-border shadow-xs bg-card p-3">
          <div className="text-[11px] font-medium text-muted-foreground">Monthly Retainers (MRR)</div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
            ₹{(monthlyTotal / 100).toLocaleString("en-IN")}/mo
          </div>
        </Card>
        <Card className="border border-border shadow-xs bg-card p-3">
          <div className="text-[11px] font-medium text-muted-foreground">One-Time Project Value</div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5 tabular-nums">
            ₹{(oneTimeTotal / 100).toLocaleString("en-IN")}
          </div>
        </Card>
        <Card className="border border-border shadow-xs bg-card p-3">
          <div className="text-[11px] font-medium text-muted-foreground">Total Services Assigned</div>
          <div className="text-xl font-bold text-foreground mt-0.5 tabular-nums">
            {subscriptions.length}
          </div>
        </Card>
      </div>

      {/* Main Container */}
      <Card className="border border-border shadow-xs bg-card">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-primary" />
              Subscribed Services & Packages
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Itemized service contracts, agreed rates, and immutable signup catalog price snapshots.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setAssignDialogOpen(true)}
            className="h-8 text-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Assign Service
          </Button>
        </CardHeader>

        <CardContent className="px-4 sm:px-5 pb-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading customer services...</p>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-center p-4 text-muted-foreground space-y-2">
              <Briefcase className="h-7 w-7 text-muted-foreground/60" />
              <div>
                <p className="text-xs font-semibold text-foreground">No Service Contracts Assigned</p>
                <p className="text-[11px] max-w-sm mt-0.5">
                  This client currently has no active retainer plans or project services attached.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssignDialogOpen(true)}
                className="h-7 text-xs mt-1"
              >
                <Plus className="h-3 w-3 mr-1" /> Assign First Service
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3 sm:p-4 rounded-lg border border-border/80 bg-background hover:border-primary/30 transition-colors space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {sub.serviceNameSnapshot || "Service Contract"}
                        </span>
                        {getStatusBadge(sub.status)}
                        <Badge
                          variant="outline"
                          className={
                            sub.billingModel === "monthly"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px]"
                              : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px]"
                          }
                        >
                          {sub.billingModel === "monthly" ? "Monthly Retainer" : "One-Time Project"}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Category: <strong className="text-foreground font-medium">{sub.categorySnapshot}</strong></span>
                        <span>Tier: <strong className="text-foreground font-medium">{sub.planSnapshot}</strong></span>
                        {sub.quantity > 1 && <span>Qty: <strong className="text-foreground font-medium">{sub.quantity}</strong></span>}
                      </div>
                    </div>

                    {/* Price Block */}
                    <div className="text-right sm:shrink-0">
                      <div className="text-base font-bold text-foreground tabular-nums">
                        ₹{(sub.totalPrice / 100).toLocaleString("en-IN")}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {sub.billingModel === "monthly" ? "/month" : ""}
                        </span>
                      </div>
                      {/* Historical Snapshot Price Proof */}
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                        <ShieldCheck className="h-3 w-3 text-blue-500" />
                        <span>
                          Catalog at signup:{" "}
                          <span className="line-through">
                            ₹{(sub.catalogPriceSnapshot / 100).toLocaleString("en-IN")}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dates & Notes */}
                  <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-border/50 text-muted-foreground gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                        Start: {sub.startDate ? new Date(sub.startDate).toLocaleDateString("en-IN") : "Immediate"}
                      </span>
                      {sub.endDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                          Renewal: {new Date(sub.endDate).toLocaleDateString("en-IN")}
                        </span>
                      )}
                      {sub.notes && (
                        <span className="italic text-muted-foreground/90">
                          "{sub.notes}"
                        </span>
                      )}
                    </div>

                    {/* Status Changer */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px]">Status:</span>
                      <select
                        value={sub.status}
                        disabled={updatingId === sub.id}
                        onChange={(e) =>
                          handleStatusChange(
                            sub.id,
                            e.target.value as "active" | "suspended" | "cancelled" | "expired"
                          )
                        }
                        className="h-7 px-2 bg-muted/50 border border-input rounded text-xs cursor-pointer"
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <AssignCustomerServiceDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        customerId={customerId}
        customerName={customerName}
        onSuccess={() => {
          fetchSubscriptions();
          onSubscriptionChange?.();
        }}
      />
    </div>
  );
}
