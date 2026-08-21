"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { DashboardLeadConversionStage } from "@/features/dashboard/types/dashboard-scope.types";

interface LeadConversionChartProps {
  data: DashboardLeadConversionStage[];
}

export function LeadConversionChart({ data }: LeadConversionChartProps) {
  const hasData = data && data.length > 0 && data.some((d) => d.count > 0);

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Lead Funnel & Conversion</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Lead volume and progression across stages
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">No lead conversion data</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Leads created and converted will reflect in this funnel.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis dataKey="stage" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={85} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Lead Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
