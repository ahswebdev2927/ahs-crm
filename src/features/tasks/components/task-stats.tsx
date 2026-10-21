"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckSquare, Clock, Loader2, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import type { TaskMetrics } from "../types/task.types";

interface TaskStatsProps {
  metrics: TaskMetrics;
  onFilterPreset?: (preset: "all" | "today" | "week" | "overdue") => void;
  onStatusClick?: (status: string) => void;
}

export function TaskStats({ metrics, onFilterPreset, onStatusClick }: TaskStatsProps) {
  const statCards = [
    {
      title: "Total Tasks",
      value: metrics.total,
      description: `${metrics.highPriority} urgent/high priority`,
      icon: CheckSquare,
      color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",
      onClick: () => {
        onStatusClick?.("all");
        onFilterPreset?.("all");
      },
    },
    {
      title: "Pending",
      value: metrics.pending,
      description: "Awaiting start",
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40",
      onClick: () => onStatusClick?.("pending"),
    },
    {
      title: "In Progress",
      value: metrics.inProgress,
      description: "Actively being worked",
      icon: Loader2,
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40",
      onClick: () => onStatusClick?.("in_progress"),
    },
    {
      title: "Completed",
      value: metrics.completed,
      description: "Successfully checked off",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
      onClick: () => onStatusClick?.("completed"),
    },
    {
      title: "Overdue Attention",
      value: metrics.overdue,
      description: metrics.overdue > 0 ? "Past due date!" : "No overdue tasks",
      icon: metrics.overdue > 0 ? AlertCircle : AlertTriangle,
      color:
        metrics.overdue > 0
          ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 font-semibold"
          : "text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/40",
      onClick: () => onFilterPreset?.("overdue"),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      {statCards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card
            key={idx}
            onClick={card.onClick}
            className="border-border dark:border-input/10 shadow-2xs hover:border-primary/40 transition-all cursor-pointer select-none"
          >
            <CardContent className="p-3 sm:p-4 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                <p className="text-[11px] text-muted-foreground">{card.description}</p>
              </div>
              <div className={`p-2 rounded-lg shrink-0 ${card.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
