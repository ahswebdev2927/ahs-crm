"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Phone,
  Mail,
  Users,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  LeadActivityType,
  LeadActivityItem,
  LeadStageHistoryItem,
  LeadTimelineItem,
} from "../types/lead.types";

interface LeadActivityTimelineProps {
  leadId: string;
  activities?: LeadActivityItem[];
  stageHistory?: LeadStageHistoryItem[];
  canUserEdit?: boolean;
  onActivityAdded?: () => void;
}

const ACTIVITY_TYPES: Array<{
  key: LeadActivityType;
  label: string;
  placeholder: string;
  icon: React.ElementType;
}> = [
  { key: "note", label: "Note", placeholder: "Log a note...", icon: FileText },
  { key: "call", label: "Call", placeholder: "Log a call...", icon: Phone },
  { key: "email", label: "Email", placeholder: "Log an email...", icon: Mail },
  { key: "meeting", label: "Meeting", placeholder: "Log a meeting...", icon: Users },
];

export function LeadActivityTimeline({
  leadId,
  activities = [],
  stageHistory = [],
  canUserEdit = true,
  onActivityAdded,
}: LeadActivityTimelineProps) {
  const [activeType, setActiveType] = React.useState<LeadActivityType>("meeting");
  const [content, setContent] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Combine and sort activities + stage changes chronologically (newest first)
  const timelineItems = React.useMemo<LeadTimelineItem[]>(() => {
    const activityItems: LeadTimelineItem[] = activities.map((act) => ({
      id: `act-${act.id}`,
      kind: "activity",
      type: act.type,
      title: getTypeName(act.type),
      content: act.content,
      createdBy: act.createdBy ?? null,
      createdAt: new Date(act.createdAt),
    }));

    const historyItems: LeadTimelineItem[] = stageHistory.map((hist) => {
      const fromName = hist.fromStage?.name ?? "Initial";
      const toName = hist.toStage?.name ?? "New Stage";
      const text = hist.reason ? `${hist.reason}` : `Moved from ${fromName} to ${toName}`;

      return {
        id: `hist-${hist.id}`,
        kind: "stage_change",
        type: "stage_change",
        title: "Stage changed",
        content: text,
        fromStage: hist.fromStage,
        toStage: hist.toStage,
        createdBy: hist.changedBy ?? null,
        createdAt: new Date(hist.createdAt),
      };
    });

    return [...activityItems, ...historyItems].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }, [activities, stageHistory]);

  const handleAddActivity = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeType,
          content: content.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to log activity.");
      }

      setContent("");
      if (onActivityAdded) {
        onActivityAdded();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to log activity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTab = ACTIVITY_TYPES.find((t) => t.key === activeType) ?? ACTIVITY_TYPES[0];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
      <h3 className="text-base font-bold text-foreground">Activity</h3>

      {/* QUICK LOG CONTAINER */}
      {canUserEdit && (
        <div className="bg-muted/40 border border-border/80 rounded-2xl p-3.5 space-y-3">
          {/* Activity Type Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {ACTIVITY_TYPES.map((typeObj) => {
              const isActive = activeType === typeObj.key;
              return (
                <button
                  key={typeObj.key}
                  type="button"
                  onClick={() => setActiveType(typeObj.key)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none",
                    isActive
                      ? "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800 shadow-2xs"
                      : "bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground border border-border/40"
                  )}
                >
                  {typeObj.label}
                </button>
              );
            })}
          </div>

          {/* Textarea */}
          <Textarea
            placeholder={currentTab.placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-background text-xs min-h-20 border-border/60 rounded-xl resize-none focus-visible:ring-1 focus-visible:ring-amber-500"
          />

          {errorMsg && (
            <div className="text-[11px] text-destructive font-medium px-1">
              {errorMsg}
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleAddActivity}
              disabled={isSubmitting || !content.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl h-8 px-5 text-xs shadow-2xs transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* COMBINED TIMELINE FEED */}
      <div className="space-y-3 pt-2">
        {timelineItems.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6 italic border border-dashed border-border/60 rounded-xl">
            No activity logged yet. Use the buttons above to log notes, calls, emails, or meetings.
          </div>
        ) : (
          timelineItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors border border-border/40"
            >
              {/* Type Badge Icon */}
              <div className="h-9 w-9 rounded-full bg-muted/70 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5 border border-border/50">
                {getTimelineIcon(item)}
              </div>

              {/* Title & Content */}
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground leading-tight">
                  <span className="font-bold">{item.title}</span> —{" "}
                  <span className="font-normal text-muted-foreground/90">{item.content}</span>
                </div>

                {/* Subtitle Metadata */}
                <div className="text-[11px] text-muted-foreground/70 font-medium">
                  {item.createdBy?.name || "System"} · {formatTimelineDate(item.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getTypeName(type: LeadActivityType): string {
  switch (type) {
    case "call":
      return "Call";
    case "email":
      return "Email";
    case "meeting":
      return "Meeting";
    case "note":
    default:
      return "Note";
  }
}

function getTimelineIcon(item: LeadTimelineItem) {
  if (item.kind === "stage_change") {
    return <ArrowRightLeft className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />;
  }

  switch (item.type) {
    case "call":
      return <Phone className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />;
    case "email":
      return <Mail className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />;
    case "meeting":
      return <Users className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />;
    case "note":
    default:
      return <FileText className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />;
  }
}

function formatTimelineDate(date: Date): string {
  const day = date.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}
