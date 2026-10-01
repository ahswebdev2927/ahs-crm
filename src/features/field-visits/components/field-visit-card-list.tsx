"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, User, Calendar, CheckCircle2, Eye, DollarSign, ExternalLink } from "lucide-react";
import { getFieldVisitStatusBadge, formatNextActionBadge } from "./field-visit-table";
import { useAuth } from "@/contexts/auth-context";
import type { FieldVisitItem } from "../types/field-visit.types";

interface FieldVisitCardListProps {
  items: FieldVisitItem[];
  onView: (visit: FieldVisitItem) => void;
  onComplete: (visit: FieldVisitItem) => void;
}

export function FieldVisitCardList({ items, onView, onComplete }: FieldVisitCardListProps) {
  const { user } = useAuth();

  if (items.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg bg-card p-6">
        <MapPin className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-foreground">No field visits scheduled</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          No site visits match your current selection.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((visit) => {
        const visitDateObj = new Date(visit.visitDate);
        const formattedDate = format(visitDateObj, "EEE, MMM d, yyyy");
        const formattedTime = format(visitDateObj, "h:mm a");

        const clientName = visit.lead
          ? visit.lead.name
          : visit.customer
          ? visit.customer.name
          : "Client";
        const clientPhone = visit.lead
          ? visit.lead.phone
          : visit.customer
          ? visit.customer.phone
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
          <Card key={visit.id} className="bg-card border-border shadow-2xs overflow-hidden flex flex-col justify-between">
            <CardContent className="p-4 space-y-3">
              {/* Header: Purpose & Status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-foreground text-base leading-tight">
                    {visit.purpose}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <User className="h-3.5 w-3.5 text-primary shrink-0" />
                    {clientLink ? (
                      <Link href={clientLink} className="hover:underline font-medium text-foreground">
                        {clientName}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{clientName}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">{getFieldVisitStatusBadge(visit.status)}</div>
              </div>

              {/* Visit Schedule */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2 rounded-md">
                <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="font-medium text-foreground">{formattedDate}</span>
                <span>at</span>
                <span>{formattedTime}</span>
              </div>

              {/* Address / Location with Quick Map Trigger */}
              {clientAddress && (
                <div className="flex items-start justify-between gap-2 text-xs bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-2.5 rounded-md">
                  <div className="flex items-start gap-1.5 text-foreground">
                    <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <span className="text-xs leading-snug">{clientAddress}</span>
                  </div>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(clientAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline shrink-0"
                  >
                    <span>Maps</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Completed Report Summary Preview (if completed) */}
              {visit.status === "completed" && visit.summary && (
                <div className="text-xs bg-muted/40 p-2.5 rounded-md text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                    Visit Summary
                  </div>
                  <p className="line-clamp-2">{visit.summary}</p>
                </div>
              )}

              {/* Next Action & Expenses */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[11px]">Next:</span>
                  {formatNextActionBadge(visit.nextAction)}
                </div>
                {visit.expenses > 0 && (
                  <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>{(visit.expenses / 100).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </CardContent>

            {/* Bottom Touch Actions */}
            <div className="bg-muted/30 border-t border-border/60 p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {clientPhone && (
                  <a
                    href={`tel:${clientPhone}`}
                    className="inline-flex items-center justify-center h-8 px-2.5 text-xs font-medium rounded-md border border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 mr-1" />
                    Call
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(visit)}
                  className="h-8 px-2.5 text-xs"
                >
                  <Eye className="h-3.5 w-3.5 mr-1 text-blue-500" />
                  Details
                </Button>
              </div>

              {visit.status !== "completed" && isAssignedOrCreator && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onComplete(visit)}
                  className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Complete Visit
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
