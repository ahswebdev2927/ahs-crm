"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { DashboardPaymentCollectionSummary } from "@/features/dashboard/types/dashboard-scope.types";

interface PaymentCollectionChartProps {
  data: DashboardPaymentCollectionSummary;
}

export function PaymentCollectionChart({ data }: PaymentCollectionChartProps) {
  const chartData = [
    { name: "Billed", amount: data.totalBilled, fill: "#3b82f6" },
    { name: "Collected", amount: data.totalCollected, fill: "#10b981" },
    { name: "Outstanding", amount: data.outstanding, fill: "#f59e0b" },
    { name: "Overdue", amount: data.overdue, fill: "#ef4444" },
  ];

  const hasData = data.totalBilled > 0 || data.totalCollected > 0;

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Payment Collection Breakdown</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Comparison of billed totals, collected revenue, and outstanding balances
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">No collection records</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Payment collection breakdown populates as invoices are generated.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value || 0).toLocaleString("en-IN")}`, "Amount"]}
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} name="Amount (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
