"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import type { DashboardLeadSourcePoint } from "@/features/dashboard/types/dashboard-scope.types";

interface LeadSourceChartProps {
  data: DashboardLeadSourcePoint[];
}

const SOURCE_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"];

export function LeadSourceChart({ data }: LeadSourceChartProps) {
  const hasData = data && data.length > 0 && data.some((d) => d.count > 0);
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Lead Source Breakdown</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Acquisition origin channels across leads (Website, Referrals, Cold Calls, WhatsApp, Social Media)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">No lead source records</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Lead channel acquisition breakdown populates as leads are captured.
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
                  nameKey="source"
                >
                  {data.map((_, index) => (
                    <Cell key={`source-cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, _name: any, entry: any) => {
                    const countVal = Number(value) || 0;
                    const pct = entry?.payload?.percentage ?? (totalCount > 0 ? Math.round((countVal / totalCount) * 100) : 0);
                    return [`${countVal} leads (${pct}%)`, "Count & Share"];
                  }}
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
