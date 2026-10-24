"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  History,
  ArrowRight,
  Loader2,
  Clock,
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
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityItem, ActivityType } from "../types/activity.types";
import { formatTimeAgo } from "../utils/activity-helpers";

export interface RecentActivitiesWidgetProps {
  leadId?: string;
  customerId?: string;
  onViewAllClick?: () => void;
  className?: string;
}

function getWidgetIcon(type: ActivityType) {
  switch (type) {
    case "call":
      return { icon: Phone, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40" };
    case "meeting":
      return { icon: Users, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" };
    case "whatsapp":
      return { icon: MessageSquare, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" };
    case "email":
      return { icon: Mail, color: "text-sky-500 bg-sky-50 dark:bg-sky-950/40" };
    case "stage_change":
      return { icon: ArrowRightLeft, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40" };
    case "appointment":
      return { icon: Calendar, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" };
    case "field_visit":
      return { icon: MapPin, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40" };
    case "invoice_issued":
      return { icon: Receipt, color: "text-teal-500 bg-teal-50 dark:bg-teal-950/40" };
    case "payment_received":
      return { icon: IndianRupee, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" };
    case "task_created":
    case "task_completed":
    case "task_status_changed":
      return { icon: CheckSquare, color: "text-violet-500 bg-violet-50 dark:bg-violet-950/40" };
    case "converted":
      return { icon: Sparkles, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" };
    case "note":
    default:
      return { icon: FileText, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40" };
  }
}

export function RecentActivitiesWidget({
  leadId,
  customerId,
  onViewAllClick,
  className,
}: RecentActivitiesWidgetProps) {
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(Boolean(leadId || customerId));

  React.useEffect(() => {
    if (!leadId && !customerId) return;

    let ignore = false;
    const params = new URLSearchParams();
    if (leadId) params.set("leadId", leadId);
    if (customerId) params.set("customerId", customerId);
    params.set("limit", "5");

    fetch(`/api/activities?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data?.data?.items) {
          setActivities(data.data.items);
          setTotalCount(data.data.total || 0);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [leadId, customerId]);

  return (
    <Card className={cn("border border-border shadow-xs bg-card", className)}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <span>Recent Activity Stream</span>
        </CardTitle>

        {onViewAllClick && totalCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onViewAllClick}
            className="h-7 text-xs text-primary hover:text-primary/90 font-medium p-0 gap-1 cursor-pointer"
          >
            <span>View Timeline</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading && (
          <div className="py-6 flex items-center justify-center text-xs text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading recent activity...</span>
          </div>
        )}

        {!isLoading && activities.length === 0 && (
          <div className="py-6 text-center text-xs text-muted-foreground italic">
            No activity events recorded yet.
          </div>
        )}

        {!isLoading && activities.length > 0 && (
          <div className="divide-y divide-border/60">
            {activities.map((act) => {
              const { icon: Icon, color } = getWidgetIcon(act.type);
              return (
                <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-2.5">
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-border/40",
                      color
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {act.subject}
                        </span>
                        {act.isLeadPhase && (
                          <Badge
                            variant="outline"
                            className="text-[9px] h-3.5 px-1 font-semibold border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                          >
                            Lead Phase
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTimeAgo(act.createdAt)}
                      </span>
                    </div>

                    {act.description && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {act.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
