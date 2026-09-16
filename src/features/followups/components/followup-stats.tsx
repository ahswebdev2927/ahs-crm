"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, Calendar, CheckCircle2, ListTodo } from "lucide-react";
import type { FollowUpMetrics } from "../types/followup.types";

interface FollowUpStatsProps {
  metrics: FollowUpMetrics;
  onFilterTimeframe?: (timeframe: "overdue" | "today" | "upcoming" | "completed" | "all") => void;
  activeTimeframe?: string;
}

export function FollowUpStats({
  metrics,
  onFilterTimeframe,
  activeTimeframe,
}: FollowUpStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      {/* Overdue Card */}
      <Card
        className={`border-border shadow-xs transition-all cursor-pointer hover:border-red-500/50 ${
          activeTimeframe === "overdue" ? "ring-2 ring-red-500/50 bg-red-50/20 dark:bg-red-950/10" : ""
        }`}
        onClick={() => onFilterTimeframe?.("overdue")}
      >
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Overdue Follow-ups</p>
            <p className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
              {metrics.overdueCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Requires immediate attention</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Today's Agenda Card */}
      <Card
        className={`border-border shadow-xs transition-all cursor-pointer hover:border-amber-500/50 ${
          activeTimeframe === "today" ? "ring-2 ring-amber-500/50 bg-amber-50/20 dark:bg-amber-950/10" : ""
        }`}
        onClick={() => onFilterTimeframe?.("today")}
      >
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Today&apos;s Agenda</p>
            <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {metrics.todayCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Scheduled for today</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Card */}
      <Card
        className={`border-border shadow-xs transition-all cursor-pointer hover:border-blue-500/50 ${
          activeTimeframe === "upcoming" ? "ring-2 ring-blue-500/50 bg-blue-50/20 dark:bg-blue-950/10" : ""
        }`}
        onClick={() => onFilterTimeframe?.("upcoming")}
      >
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Upcoming Follow-ups</p>
            <p className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {metrics.upcomingCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Scheduled for future dates</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Completed Today Card */}
      <Card
        className={`border-border shadow-xs transition-all cursor-pointer hover:border-emerald-500/50 ${
          activeTimeframe === "completed" ? "ring-2 ring-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10" : ""
        }`}
        onClick={() => onFilterTimeframe?.("completed")}
      >
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Completed Today</p>
            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {metrics.completedTodayCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Successfully logged</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
