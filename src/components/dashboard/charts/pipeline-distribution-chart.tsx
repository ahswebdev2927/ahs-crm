"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import type { DashboardPipelineDistributionStage } from "@/features/dashboard/types/dashboard-scope.types";

interface PipelineDistributionChartProps {
  data: DashboardPipelineDistributionStage[];
}

const COLORS = ["#3b82f6", "#10b981", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6"];

export function PipelineDistributionChart({ data }: PipelineDistributionChartProps) {
  const hasData = data && data.length > 0 && data.some((d) => d.count > 0);

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Active Pipeline Distribution</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Lead concentration by active pipeline stage
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">No active pipeline stages</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Pipeline distribution renders as deals progress.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="stageName"
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "0.75rem" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
