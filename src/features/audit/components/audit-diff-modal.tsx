"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldAlert,
  ArrowRight,
  Clock,
  User,
  Globe,
  Laptop,
  Copy,
  Check,
  FileCode,
  Layers,
} from "lucide-react";
import type { AuditLogRecord } from "../schemas/audit.schema";

interface AuditDiffModalProps {
  entry: AuditLogRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Checks if a key represents an Indian Rupee monetary amount (in paise or rupees)
 */
function isMonetaryKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes("paise") ||
    lower.includes("price") ||
    lower.includes("subtotal") ||
    lower.includes("discount") ||
    lower.includes("total") ||
    lower.includes("amount")
  );
}

/**
 * Formats a value nicely for display in the audit diff inspector.
 */
function formatDisplayValue(key: string, val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";

  // Handle monetary fields
  if (isMonetaryKey(key) && typeof val === "number") {
    // If field contains 'paise', divide by 100
    if (key.toLowerCase().includes("paise")) {
      return (val / 100).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      });
    }
    // If price or total amount is greater than 1000 and has no paise in key, format as INR
    return val.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  }

  if (typeof val === "object") {
    return JSON.stringify(val);
  }

  return String(val);
}

/**
 * Converts camelCase or snake_case key to clean title case.
 */
function formatKeyLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export function AuditDiffModal({ entry, open, onOpenChange }: AuditDiffModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!entry) return null;

  const oldObj = entry.oldData || {};
  const newObj = entry.newData || {};
  const isCreateAction = !entry.oldData && !!entry.newData;

  // Union of all modified keys
  const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

  const handleCopyJson = () => {
    const rawPayload = JSON.stringify(
      {
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actor: entry.user,
        timestamp: entry.createdAt,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        oldData: entry.oldData,
        newData: entry.newData,
      },
      null,
      2
    );
    navigator.clipboard.writeText(rawPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto no-scrollbar sm:p-6 p-4">
        <DialogHeader className="space-y-2 border-b border-border/60 pb-3 dark:border-input/10">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                #{entry.id}
              </span>
              <Badge variant="outline" className="font-mono text-xs font-semibold uppercase">
                {entry.action}
              </Badge>
              {entry.entityType && (
                <Badge variant="secondary" className="text-xs capitalize font-medium">
                  {entry.entityType}
                  {entry.entityId ? ` #${entry.entityId.slice(0, 8)}` : ""}
                </Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyJson}
              className="h-7 text-xs gap-1.5"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Copied" : "Copy JSON"}</span>
            </Button>
          </div>

          <DialogTitle className="text-base font-bold text-foreground">
            Audit Entry Inspection
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Immutable log record verifying the exact before and after mutation attributes.
          </DialogDescription>
        </DialogHeader>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-2 text-xs bg-muted/30 p-3 rounded-lg border border-border/50 dark:border-input/5">
          <div className="flex items-center gap-2">
            <User className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Actor:</span>
            <span className="font-medium text-foreground truncate">
              {entry.user ? `${entry.user.name} (${entry.user.email})` : "System / Background"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Time:</span>
            <span className="font-medium text-foreground">
              {format(new Date(entry.createdAt), "dd MMM yyyy, hh:mm:ss a")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Globe className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Client IP:</span>
            <span className="font-mono text-[11px] font-medium text-foreground">
              {entry.ipAddress || "127.0.0.1"}
            </span>
          </div>

          <div className="flex items-center gap-2 truncate">
            <Laptop className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Agent:</span>
            <span className="truncate text-foreground" title={entry.userAgent || "Unknown"}>
              {entry.userAgent ? entry.userAgent.slice(0, 35) + "..." : "Server / System"}
            </span>
          </div>
        </div>

        {/* Inspector Tabs */}
        <Tabs defaultValue="diff" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="diff" className="text-xs gap-1.5">
              <Layers className="size-3.5" />
              <span>Field Comparison ({allKeys.length})</span>
            </TabsTrigger>
            <TabsTrigger value="raw" className="text-xs gap-1.5">
              <FileCode className="size-3.5" />
              <span>Raw JSON View</span>
            </TabsTrigger>
          </TabsList>

          {/* Visual Diff Tab */}
          <TabsContent value="diff" className="space-y-2 mt-0">
            {allKeys.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border/80">
                No payload delta recorded for this event.
              </div>
            ) : isCreateAction ? (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                  Initial Properties Set on Creation:
                </div>
                {allKeys.map((key) => (
                  <div
                    key={key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-md border border-border/40 bg-zinc-50/50 dark:bg-zinc-950/20 text-xs gap-1"
                  >
                    <span className="font-semibold text-foreground/80">{formatKeyLabel(key)}</span>
                    <span className="font-mono text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50">
                      {formatDisplayValue(key, newObj[key])}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2 select-none">
                  <div className="col-span-4">Attribute</div>
                  <div className="col-span-4">Previous Value</div>
                  <div className="col-span-4 pl-3">Updated Value</div>
                </div>

                {allKeys.map((key) => {
                  const oldVal = oldObj[key];
                  const newVal = newObj[key];
                  const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

                  return (
                    <div
                      key={key}
                      className={`grid grid-cols-12 items-center p-2.5 rounded-lg border text-xs gap-2 transition-colors ${
                        isChanged
                          ? "border-amber-500/40 bg-amber-500/5"
                          : "border-border/40 bg-muted/10 opacity-75"
                      }`}
                    >
                      <div className="col-span-4 font-semibold text-foreground truncate" title={key}>
                        {formatKeyLabel(key)}
                      </div>

                      <div className="col-span-4 font-mono text-[11px] truncate">
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                          {formatDisplayValue(key, oldVal)}
                        </span>
                      </div>

                      <div className="col-span-4 font-mono text-[11px] flex items-center gap-1.5 truncate">
                        <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40 truncate">
                          {formatDisplayValue(key, newVal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Raw JSON View */}
          <TabsContent value="raw" className="space-y-3 mt-0">
            <div>
              <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Previous Data (oldData):
              </h5>
              <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-48 border border-zinc-800">
                {entry.oldData ? JSON.stringify(entry.oldData, null, 2) : "null"}
              </pre>
            </div>

            <div>
              <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                New Data (newData):
              </h5>
              <pre className="p-3 bg-zinc-950 text-zinc-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-48 border border-zinc-800">
                {entry.newData ? JSON.stringify(entry.newData, null, 2) : "null"}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
