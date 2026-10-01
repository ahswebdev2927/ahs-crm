"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, CheckCircle2, Clock, DollarSign, TrendingUp } from "lucide-react";
import type { FieldVisitMetrics } from "../types/field-visit.types";

interface FieldVisitStatsProps {
  metrics: FieldVisitMetrics;
}

export function FieldVisitStats({ metrics }: FieldVisitStatsProps) {
  const formattedExpenses = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(metrics.totalExpenses / 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Visits */}
      <Card className="bg-card border-border shadow-2xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Visits
            </p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {metrics.total}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Assigned field site visits
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Completed Visits */}
      <Card className="bg-card border-border shadow-2xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Completed
            </p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {metrics.completed}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3 w-3" />
              {metrics.total > 0
                ? `${Math.round((metrics.completed / metrics.total) * 100)}% completion rate`
                : "0% completed"}
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Scheduled / Pending */}
      <Card className="bg-card border-border shadow-2xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Scheduled
            </p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {metrics.scheduled}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Upcoming field visits
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Total Expenses */}
      <Card className="bg-card border-border shadow-2xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Expenses
            </p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {formattedExpenses}
            </h3>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5 flex items-center gap-1 font-medium">
              <TrendingUp className="h-3 w-3" />
              Recorded visit costs
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
