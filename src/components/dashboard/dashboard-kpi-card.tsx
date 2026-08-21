"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { DashboardKpiMetric } from "@/features/dashboard/types/dashboard-scope.types";

interface DashboardKpiCardProps {
  metric: DashboardKpiMetric;
}

export function DashboardKpiCard({ metric }: DashboardKpiCardProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "positive":
        return "text-emerald-600 bg-emerald-500/10 border-emerald-200 dark:border-emerald-900";
      case "warning":
        return "text-amber-600 bg-amber-500/10 border-amber-200 dark:border-amber-900";
      case "negative":
        return "text-rose-600 bg-rose-500/10 border-rose-200 dark:border-rose-900";
      default:
        return "text-primary bg-primary/10 border-border";
    }
  };

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {metric.title}
          </p>
          {metric.changePercent !== undefined && (
            <div
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(
                metric.status
              )}`}
            >
              {metric.changePercent > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : metric.changePercent < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span>{Math.abs(metric.changePercent)}%</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <h3 className="text-2xl font-bold tracking-tight text-foreground">
            {metric.value}
          </h3>
        </div>

        {metric.description && (
          <p className="mt-1 text-xs text-muted-foreground">
            {metric.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
