"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PhoneCall,
  Calendar,
  MessageSquare,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Building2,
  FileText,
  XCircle,
  MoreVertical,
  Check,
} from "lucide-react";
import type { FollowUpItem } from "../types/followup.types";
import type { FollowUpType, FollowUpStatus } from "../schemas/followup.schema";

interface FollowUpCardProps {
  followUp: FollowUpItem;
  onComplete?: (followUp: FollowUpItem) => void;
  onReschedule?: (followUp: FollowUpItem) => void;
  onCancel?: (followUp: FollowUpItem) => void;
  showEntityLink?: boolean;
}

export function FollowUpCard({
  followUp,
  onComplete,
  onReschedule,
  onCancel,
  showEntityLink = true,
}: FollowUpCardProps) {
  const scheduledDate = new Date(followUp.scheduledAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const isPending = followUp.status === "scheduled";
  const isOverdue = isPending && scheduledDate < startOfToday;
  const isToday = isPending && scheduledDate >= startOfToday && scheduledDate <= endOfToday;
  const isUpcoming = isPending && scheduledDate > endOfToday;
  const isCompleted = followUp.status === "completed";
  const isCancelled = followUp.status === "cancelled";

  const getTypeIcon = (type: FollowUpType) => {
    switch (type) {
      case "call":
        return <PhoneCall className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "meeting":
        return <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "whatsapp":
        return <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "email":
        return <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "site_visit":
        return <MapPin className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case "other":
      default:
        return <Clock className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />;
    }
  };

  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Completed
        </Badge>
      );
    }
    if (isOverdue) {
      return (
        <Badge variant="destructive" className="bg-red-600 text-white flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Overdue
        </Badge>
      );
    }
    if (isToday) {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1">
          <Clock className="h-3 w-3" /> Today
        </Badge>
      );
    }
    if (isCancelled) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Cancelled
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Upcoming
      </Badge>
    );
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="border-border shadow-xs hover:border-accent transition-colors">
      <CardContent className="p-4 sm:p-5 space-y-3">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-muted/60 border border-border shrink-0">
              {getTypeIcon(followUp.type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm capitalize text-foreground">
                  {followUp.type.replace("_", " ")} Follow-up
                </span>
                {getStatusBadge()}
              </div>

              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDateTime(scheduledDate)}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {isPending && (
            <div className="flex items-center gap-1.5 shrink-0">
              {onComplete && (
                <Button
                  size="sm"
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-2.5"
                  onClick={() => onComplete(followUp)}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Complete
                </Button>
              )}
              {onReschedule && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 px-2.5"
                  onClick={() => onReschedule(followUp)}
                >
                  Reschedule
                </Button>
              )}
              {onCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-destructive hover:bg-destructive/10 h-8 px-2"
                  onClick={() => onCancel(followUp)}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Target Entity (Lead or Customer) Link */}
        {showEntityLink && (
          <div className="flex flex-wrap items-center gap-3 text-xs pt-1 border-t border-border/50">
            {followUp.lead && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>Lead:</span>
                <Link
                  href={`/sales/leads/${followUp.lead.id}`}
                  className="font-medium text-foreground hover:text-primary underline-offset-4 hover:underline"
                >
                  {followUp.lead.name}
                  {followUp.lead.company ? ` (${followUp.lead.company})` : ""}
                </Link>
              </div>
            )}

            {followUp.customer && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>Customer:</span>
                <Link
                  href={`/customers/customers/${followUp.customer.id}`}
                  className="font-medium text-foreground hover:text-primary underline-offset-4 hover:underline"
                >
                  {followUp.customer.name}
                  {followUp.customer.company ? ` (${followUp.customer.company})` : ""}
                </Link>
              </div>
            )}

            {followUp.assignedTo && (
              <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                <span>Assigned to:</span>
                <span className="font-medium text-foreground">{followUp.assignedTo.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Follow-up Notes */}
        {followUp.notes && (
          <div className="text-xs bg-muted/40 p-2.5 rounded-md border border-border/60 text-foreground/90 whitespace-pre-line leading-relaxed">
            <span className="font-semibold text-muted-foreground block mb-0.5">Notes:</span>
            {followUp.notes}
          </div>
        )}

        {/* Completion Outcome Notes */}
        {isCompleted && followUp.outcome && (
          <div className="text-xs bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-950 dark:text-emerald-200 whitespace-pre-line leading-relaxed">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300 block mb-0.5">
              Outcome ({followUp.completedAt ? formatDateTime(new Date(followUp.completedAt)) : "Completed"}):
            </span>
            {followUp.outcome}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
