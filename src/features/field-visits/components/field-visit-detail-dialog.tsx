"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, User, Calendar, DollarSign, CheckCircle2, ExternalLink, FileText } from "lucide-react";
import { getFieldVisitStatusBadge, formatNextActionBadge } from "./field-visit-table";
import type { FieldVisitItem } from "../types/field-visit.types";

interface FieldVisitDetailDialogProps {
  visit: FieldVisitItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleteClick: (visit: FieldVisitItem) => void;
}

export function FieldVisitDetailDialog({
  visit,
  open,
  onOpenChange,
  onCompleteClick,
}: FieldVisitDetailDialogProps) {
  if (!visit) return null;

  const visitDateObj = new Date(visit.visitDate);
  const formattedDate = format(visitDateObj, "EEEE, MMMM d, yyyy");
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
  const clientPhone = visit.lead
    ? visit.lead.phone
    : visit.customer
    ? visit.customer.phone
    : null;
  const clientEmail = visit.lead
    ? visit.lead.email
    : visit.customer
    ? visit.customer.email
    : null;
  const clientAddress = visit.customer?.address || null;
  const clientLink = visit.leadId
    ? `/sales/leads/${visit.leadId}`
    : visit.customerId
    ? `/customers/${visit.customerId}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {visit.purpose}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Field Visit Record #{visit.id.slice(0, 8)}
              </DialogDescription>
            </div>
            {getFieldVisitStatusBadge(visit.status)}
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Client & Site Overview Card */}
          <div className="bg-muted/40 p-3.5 rounded-lg border border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                <User className="h-4 w-4 text-primary" />
                {clientLink ? (
                  <Link href={clientLink} className="hover:underline text-primary">
                    {clientName} {clientCompany ? `(${clientCompany})` : ""}
                  </Link>
                ) : (
                  <span>{clientName}</span>
                )}
              </div>
              {clientPhone && (
                <a
                  href={`tel:${clientPhone}`}
                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>{clientPhone}</span>
                </a>
              )}
            </div>

            {clientEmail && (
              <div className="text-muted-foreground text-[11px] pl-5.5">
                Email: {clientEmail}
              </div>
            )}

            {clientAddress && (
              <div className="flex items-start justify-between gap-2 pt-1.5 border-t border-border/50">
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-foreground">{clientAddress}</span>
                </div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(clientAddress)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline shrink-0"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* Schedule & Agent Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card p-3 rounded-lg border border-border/60 space-y-1">
              <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                <span>Visit Schedule</span>
              </div>
              <div className="font-semibold text-foreground">{formattedDate}</div>
              <div className="text-muted-foreground">{formattedTime}</div>
            </div>

            <div className="bg-card p-3 rounded-lg border border-border/60 space-y-1">
              <div className="text-muted-foreground text-[11px]">Field Representative</div>
              <div className="font-semibold text-foreground">
                {visit.assignedTo?.name || "Field Agent"}
              </div>
              <div className="text-muted-foreground">{visit.assignedTo?.email || ""}</div>
            </div>
          </div>

          {/* Visit Report Summary (if completed) */}
          {visit.status === "completed" ? (
            <div className="space-y-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-3.5 rounded-lg">
              <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Submitted Visit Report</span>
              </div>

              {visit.summary && (
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                    Visit Summary
                  </div>
                  <p className="text-foreground leading-relaxed">{visit.summary}</p>
                </div>
              )}

              {visit.requirements && (
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                    Gathered Requirements
                  </div>
                  <p className="text-foreground leading-relaxed">{visit.requirements}</p>
                </div>
              )}

              {visit.outcome && (
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                    Outcome & Interest
                  </div>
                  <p className="text-foreground">{visit.outcome}</p>
                </div>
              )}

              {visit.feedback && (
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                    Feedback / Notes
                  </div>
                  <p className="text-foreground">{visit.feedback}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Next Action:</span>
                  {formatNextActionBadge(visit.nextAction)}
                </div>
                {visit.expenses > 0 && (
                  <div className="flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>{(visit.expenses / 100).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3.5 rounded-lg text-center space-y-2">
              <FileText className="h-6 w-6 text-amber-600 mx-auto" />
              <div className="font-semibold text-foreground text-xs">Visit Report Pending</div>
              <p className="text-muted-foreground text-[11px]">
                This site visit has not been completed yet. Submit the report once the visit is finished.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onCompleteClick(visit);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Complete Visit Report
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
