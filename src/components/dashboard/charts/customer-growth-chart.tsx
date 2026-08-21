"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { DashboardCustomerGrowthPoint } from "@/features/dashboard/types/dashboard-scope.types";

interface CustomerGrowthChartProps {
  data: DashboardCustomerGrowthPoint[];
}

export function CustomerGrowthChart({ data }: CustomerGrowthChartProps) {
  const hasData = data && data.length > 0 && data.some((d) => d.totalCustomers > 0 || d.newCustomers > 0);

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Customer Growth Trajectory</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          New account acquisition and cumulative active customer count
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">No customer growth data</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Customer growth populates as accounts are converted or added.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalCustomers"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Total Customers"
                />
                <Line
                  type="monotone"
                  dataKey="newCustomers"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="New Accounts"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
