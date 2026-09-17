"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import type { AppointmentMetrics } from "../types/appointment.types";

interface AppointmentStatsProps {
  metrics: AppointmentMetrics;
}

export function AppointmentStats({ metrics }: AppointmentStatsProps) {
  const statCards = [
    {
      title: "Total Appointments",
      value: metrics.total,
      description: "All recorded field meetings",
      icon: Calendar,
      color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",
    },
    {
      title: "Scheduled & Confirmed",
      value: metrics.scheduled + metrics.confirmed,
      description: `${metrics.confirmed} confirmed by client`,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40",
    },
    {
      title: "In Progress / Completed",
      value: metrics.inProgress + metrics.completed,
      description: `${metrics.completed} marked completed`,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      title: "Rescheduled / Missed",
      value: metrics.rescheduled + metrics.noShow,
      description: `${metrics.noShow} no-show records`,
      icon: AlertTriangle,
      color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40",
    },
    {
      title: "Cancelled",
      value: metrics.cancelled,
      description: "Cancelled consultations",
      icon: XCircle,
      color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      {statCards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className="border-border dark:border-input/10 shadow-2xs">
            <CardContent className="p-4 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                <p className="text-[11px] text-muted-foreground truncate">{card.description}</p>
              </div>
              <div className={`p-2 rounded-lg ${card.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
