"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Phone,
  Mail,
  Users,
  MessageSquare,
  ArrowRightLeft,
  Calendar,
  MapPin,
  Receipt,
  IndianRupee,
  CheckSquare,
  Sparkles,
  MoreVertical,
  Edit2,
  Trash2,
  Clock,
  User,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityItem, ActivityType } from "../types/activity.types";
import {
  getTypeLabel,
  getOutcomeLabel,
  formatActivityDate,
  formatTimeAgo,
} from "../utils/activity-helpers";

export interface ActivityTimelineItemProps {
  activity: ActivityItem;
  onActivityUpdated?: () => void;
  onActivityDeleted?: () => void;
}

/**
 * Resolves visual icon and styling accents based on activity type
 */
function getActivityVisuals(type: ActivityType) {
  switch (type) {
    case "call":
      return {
        icon: Phone,
        bgClass: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
        borderClass: "border-amber-300 dark:border-amber-800",
      };
    case "meeting":
      return {
        icon: Users,
        bgClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
        borderClass: "border-indigo-300 dark:border-indigo-800",
      };
    case "whatsapp":
      return {
        icon: MessageSquare,
        bgClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
        borderClass: "border-emerald-300 dark:border-emerald-800",
      };
    case "email":
      return {
        icon: Mail,
        bgClass: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
        borderClass: "border-sky-300 dark:border-sky-800",
      };
    case "stage_change":
      return {
        icon: ArrowRightLeft,
        bgClass: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
        borderClass: "border-purple-300 dark:border-purple-800",
      };
    case "appointment":
      return {
        icon: Calendar,
        bgClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
        borderClass: "border-indigo-300 dark:border-indigo-800",
      };
    case "field_visit":
      return {
        icon: MapPin,
        bgClass: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
        borderClass: "border-amber-300 dark:border-amber-800",
      };
    case "quotation_created":
    case "quotation_sent":
    case "quotation_accepted":
      return {
        icon: FileText,
        bgClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300",
        borderClass: "border-cyan-300 dark:border-cyan-800",
      };
    case "invoice_issued":
      return {
        icon: Receipt,
        bgClass: "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
        borderClass: "border-teal-300 dark:border-teal-800",
      };
    case "payment_received":
      return {
        icon: IndianRupee,
        bgClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
        borderClass: "border-emerald-300 dark:border-emerald-800",
      };
    case "task_created":
    case "task_completed":
    case "task_status_changed":
      return {
        icon: CheckSquare,
        bgClass: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
        borderClass: "border-violet-300 dark:border-violet-800",
      };
    case "converted":
      return {
        icon: Sparkles,
        bgClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
        borderClass: "border-emerald-300 dark:border-emerald-800",
      };
    case "note":
    default:
      return {
        icon: FileText,
        bgClass: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
        borderClass: "border-blue-300 dark:border-blue-800",
      };
  }
}

export function ActivityTimelineItem({
  activity,
  onActivityUpdated,
  onActivityDeleted,
}: ActivityTimelineItemProps) {
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  const [editSubject, setEditSubject] = React.useState<string>(activity.subject);
  const [editDescription, setEditDescription] = React.useState<string>(activity.description || "");
  const [editOutcome, setEditOutcome] = React.useState<string>(activity.outcome || "");
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);
  const [showMetadata, setShowMetadata] = React.useState<boolean>(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const visuals = getActivityVisuals(activity.type);
  const Icon = visuals.icon;
  const outcomeLabel = getOutcomeLabel(activity.outcome);
  const metadata = activity.metadata;

  const handleSaveEdit = async () => {
    if (!editDescription.trim()) return;
    setIsSaving(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/activities/${activity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: editSubject.trim(),
          description: editDescription.trim(),
          outcome: editOutcome || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update activity.");
      }

      setIsEditing(false);
      if (onActivityUpdated) onActivityUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update.";
      setActionError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this activity log?")) return;
    setIsDeleting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/activities/${activity.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete activity.");
      }

      if (onActivityDeleted) onActivityDeleted();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete.";
      setActionError(msg);
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative pl-7 sm:pl-9 pb-6 group last:pb-2">
      {/* Timeline Connecting Vertical Line */}
      <div className="absolute left-[13px] sm:left-[17px] top-6 bottom-0 w-0.5 bg-border group-last:hidden" />

      {/* Node Icon Badge */}
      <div
        className={cn(
          "absolute left-0 top-0.5 h-7 w-7 sm:h-8 sm:w-8 rounded-full border flex items-center justify-center shrink-0 z-10 shadow-2xs",
          visuals.bgClass,
          visuals.borderClass
        )}
      >
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>

      {/* Item Body Card */}
      <div className="bg-card border border-border/80 rounded-xl p-3.5 sm:p-4 shadow-xs transition-colors hover:border-border">
        {/* Header: Title, Category/Outcome Badge, Timestamp, Dropdown */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-semibold text-xs sm:text-sm text-foreground">
                {activity.subject}
              </span>

              {/* Lead Phase Badge for converted customers */}
              {activity.isLeadPhase && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4.5 px-1.5 font-medium border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                >
                  Lead Phase
                </Badge>
              )}

              {/* Outcome Badge */}
              {outcomeLabel && (
                <Badge
                  variant="secondary"
                  className="text-[10px] h-4.5 px-1.5 font-medium bg-muted text-muted-foreground"
                >
                  {outcomeLabel}
                </Badge>
              )}

              {/* Type Label */}
              <span className="text-[11px] text-muted-foreground font-normal">
                • {getTypeLabel(activity.type)}
              </span>
            </div>

            {/* Author & Timestamp */}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1 font-medium text-foreground/80">
                <User className="h-3 w-3" />
                {activity.user?.name || "System"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatActivityDate(activity.createdAt)} ({formatTimeAgo(activity.createdAt)})
              </span>
            </div>
          </div>

          {/* Action Menu (Only if manual communication and user has edit/delete permission) */}
          {(activity.canEdit || activity.canDelete) && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer -mr-1">
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                {activity.canEdit && (
                  <DropdownMenuItem
                    onClick={() => setIsEditing(true)}
                    className="cursor-pointer gap-2"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Note</span>
                  </DropdownMenuItem>
                )}
                {activity.canDelete && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>Delete</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content Section: Viewing vs Editing */}
        {isEditing ? (
          <div className="mt-3 space-y-2.5 pt-2 border-t border-border">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Subject
              </label>
              <Input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="h-8 text-xs bg-background"
                maxLength={200}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Description / Notes
              </label>
              <Textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="text-xs bg-background"
                maxLength={5000}
              />
            </div>

            {activity.outcome && (
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Outcome
                </label>
                <Select value={editOutcome} onValueChange={(val) => setEditOutcome(val ?? "")}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connected" className="text-xs">Connected / Spoke</SelectItem>
                    <SelectItem value="left_message" className="text-xs">Left Message</SelectItem>
                    <SelectItem value="no_answer" className="text-xs">No Answer</SelectItem>
                    <SelectItem value="busy" className="text-xs">Busy</SelectItem>
                    <SelectItem value="held" className="text-xs">Meeting Held</SelectItem>
                    <SelectItem value="rescheduled" className="text-xs">Rescheduled</SelectItem>
                    <SelectItem value="sent" className="text-xs">Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {actionError && (
              <p className="text-xs text-destructive">{actionError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditSubject(activity.subject);
                  setEditDescription(activity.description || "");
                  setEditOutcome(activity.outcome || "");
                }}
                disabled={isSaving}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveEdit}
                disabled={isSaving || !editDescription.trim()}
                className="h-7 text-xs font-semibold px-3"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          activity.description && (
            <div className="mt-2.5 text-xs text-foreground/90 whitespace-pre-line leading-relaxed bg-muted/20 p-2.5 rounded-lg border border-border/50">
              {activity.description}
            </div>
          )
        )}

        {/* Structured Context Metadata */}
        {metadata && Object.keys(metadata).length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-border/50">
            {/* Stage Change Visualization */}
            {activity.type === "stage_change" && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Transition:</span>
                <span className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                  {metadata.fromStageName || "Initial"}
                </span>
                <span className="text-muted-foreground">→</span>
                <span
                  className="font-bold px-2 py-0.5 rounded text-white"
                  style={{ backgroundColor: metadata.toStageColor || "#3b82f6" }}
                >
                  {metadata.toStageName || "Next"}
                </span>
              </div>
            )}

            {/* Commercial Amount Banner (Quotation / Payment / Invoice) */}
            {metadata.formattedAmount && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 mt-1">
                <span>Value:</span>
                <span>{metadata.formattedAmount}</span>
              </div>
            )}

            {/* Expandable Key-Value Details */}
            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => setShowMetadata(!showMetadata)}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
              >
                <span>{showMetadata ? "Hide details" : "Show technical details"}</span>
                {showMetadata ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showMetadata && (
                <div className="mt-2 p-2 bg-muted/40 rounded-md border border-border/60 text-[11px] space-y-1">
                  {Object.entries(metadata).map(([key, val]) => {
                    if (val === undefined || val === null || key === "formattedAmount") return null;
                    return (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground capitalize font-mono text-[10px]">
                          {key.replace(/([A-Z])/g, " $1")}:
                        </span>
                        <span className="font-semibold text-foreground text-right truncate max-w-[220px]">
                          {typeof val === "object" ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
