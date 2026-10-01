"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, User, MoreHorizontal, Eye, CheckCircle2, DollarSign, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { FieldVisitItem } from "../types/field-visit.types";
import type { FieldVisitStatus, NextActionType } from "../schemas/field-visit.schema";

interface FieldVisitTableProps {
  items: FieldVisitItem[];
  onView: (visit: FieldVisitItem) => void;
  onComplete: (visit: FieldVisitItem) => void;
  onEdit: (visit: FieldVisitItem) => void;
}

export function getFieldVisitStatusBadge(status: FieldVisitStatus) {
  switch (status) {
    case "scheduled":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
        >
          Scheduled
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="bg-emerald-500 text-white border-transparent">
          Completed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge
          variant="outline"
          className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
        >
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function formatNextActionBadge(action: NextActionType | null) {
  if (!action) return <span className="text-muted-foreground/60 italic">—</span>;

  const label = action.replace("_", " ").toUpperCase();
  switch (action) {
    case "won":
      return <Badge className="bg-emerald-600 text-white border-transparent">{label}</Badge>;
    case "lost":
      return <Badge className="bg-rose-600 text-white border-transparent">{label}</Badge>;
    case "proposal":
      return <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300">{label}</Badge>;
    case "negotiation":
      return <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">{label}</Badge>;
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
}

export function FieldVisitTable({ items, onView, onComplete, onEdit }: FieldVisitTableProps) {
  const { user } = useAuth();

  if (items.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg bg-card p-6">
        <MapPin className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-foreground">No field visits found</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          No field visits match the selected search or filter options.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border dark:border-input/10 bg-card shadow-2xs">
      <table className="w-full text-xs text-left">
        <thead className="bg-muted/50 border-b border-border/80 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
          <tr>
            <th className="px-4 py-3">Purpose & Client</th>
            <th className="px-4 py-3">Visit Date</th>
            <th className="px-4 py-3">Location / Site Address</th>
            <th className="px-4 py-3">Field Representative</th>
            <th className="px-4 py-3">Expenses</th>
            <th className="px-4 py-3">Status & Next Action</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {items.map((visit) => {
            const visitDateObj = new Date(visit.visitDate);
            const formattedDate = format(visitDateObj, "EEE, MMM d, yyyy");
            const formattedTime = format(visitDateObj, "h:mm a");

            const clientName = visit.lead
              ? visit.lead.name
              : visit.customer
              ? visit.customer.name
              : "Client";
            const clientCompany = visit.lead
              ? visit.lead.company
              : visit.customer
              ? visit.customer.company
              : null;
            const clientAddress = visit.customer?.address || null;
            const clientLink = visit.leadId
              ? `/sales/leads/${visit.leadId}`
              : visit.customerId
              ? `/customers/${visit.customerId}`
              : null;

            const isAssignedOrCreator = user
              ? user.id === visit.createdById || user.id === visit.assignedToId
              : false;

            return (
              <tr key={visit.id} className="hover:bg-muted/30 transition-colors">
                {/* Purpose & Client */}
                <td className="px-4 py-3">
                  <div className="font-semibold text-foreground text-sm">{visit.purpose}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {clientLink ? (
                      <Link href={clientLink} className="hover:underline text-primary font-medium">
                        {clientName} {clientCompany ? `(${clientCompany})` : ""}
                      </Link>
                    ) : (
                      <span>{clientName}</span>
                    )}
                  </div>
                </td>

                {/* Visit Date */}
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{formattedDate}</div>
                  <div className="text-muted-foreground text-[11px]">{formattedTime}</div>
                </td>

                {/* Location / Site */}
                <td className="px-4 py-3">
                  {clientAddress ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground max-w-xs truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span className="truncate" title={clientAddress}>
                        {clientAddress}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/60 italic">Site address available on record</span>
                  )}
                </td>

                {/* Field Representative */}
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">
                    {visit.assignedTo?.name || "Field Agent"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {visit.assignedTo?.email || ""}
                  </div>
                </td>

                {/* Expenses */}
                <td className="px-4 py-3 font-medium text-foreground">
                  {visit.expenses > 0 ? (
                    <span className="flex items-center text-purple-600 dark:text-purple-400">
                      <DollarSign className="h-3 w-3" />
                      {(visit.expenses / 100).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">$0.00</span>
                  )}
                </td>

                {/* Status & Next Action */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 items-start">
                    {getFieldVisitStatusBadge(visit.status)}
                    {visit.nextAction && (
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span>Next:</span>
                        {formatNextActionBadge(visit.nextAction)}
                      </div>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onView(visit)}>
                        <Eye className="h-3.5 w-3.5 mr-2 text-blue-500" />
                        View Visit Details
                      </DropdownMenuItem>

                      {visit.status !== "completed" && isAssignedOrCreator && (
                        <DropdownMenuItem onClick={() => onComplete(visit)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                          Complete Visit Report
                        </DropdownMenuItem>
                      )}

                      {isAssignedOrCreator && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onEdit(visit)}>
                            <Calendar className="h-3.5 w-3.5 mr-2 text-slate-500" />
                            Edit Schedule
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
