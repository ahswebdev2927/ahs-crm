"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatAxisINR } from "@/lib/formatters";
import type { PaymentReportData } from "../../types/reports.types";
import { Receipt, Wallet, AlertCircle, Clock, Percent } from "lucide-react";

interface PaymentReportTabProps {
  data: PaymentReportData;
}

/**
 * Functional component rendering the Payments, Billings, and Collections Report.
 */
export function PaymentReportTab({ data }: PaymentReportTabProps) {
  const { kpis, billedVsCollectedTrend, agingBuckets, recentPaymentsSummary } = data;

  const chartData = billedVsCollectedTrend.map((item) => ({
    date: item.date,
    billedRupees: item.billedPaise / 100,
    collectedRupees: item.collectedPaise / 100,
  }));

  return (
    <div className="space-y-6">
      {/* Financial Health KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
              <Receipt className="h-3.5 w-3.5 text-blue-500" />
              Total Invoiced
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 truncate">
              {formatINR(kpis.totalBilledPaise)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Billed in period
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-3.5 w-3.5" />
              Total Collected
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 truncate">
              {formatINR(kpis.totalCollectedPaise)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Realized cash receipts
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-amber-500">
              <Clock className="h-3.5 w-3.5" />
              Outstanding
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-amber-500 mt-1 truncate">
              {formatINR(kpis.outstandingPaise)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Pending receivables
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-rose-500">
              <AlertCircle className="h-3.5 w-3.5" />
              Total Overdue
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-rose-500 mt-1 truncate">
              {formatINR(kpis.overduePaise)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Past payment due date
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
              <Percent className="h-3.5 w-3.5 text-indigo-500" />
              Efficiency
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">
              {kpis.collectionEfficiencyRate}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Collected vs Billed
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Trend Chart */}
      <Card className="border-border dark:border-input/10 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Cash Flow: Invoiced vs Realized Collections</CardTitle>
          <CardDescription className="text-xs">
            Comparison between billed invoices and cash receipts received across the period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No billing or collection records found in the selected range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 15, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tickFormatter={(val) => formatAxisINR(val)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover text-popover-foreground rounded-lg border border-border p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-semibold">{label}</p>
                          <p className="text-blue-500">Invoiced: {formatINR(d.billedRupees * 100)}</p>
                          <p className="text-emerald-500">Collected: {formatINR(d.collectedRupees * 100)}</p>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="billedRupees" name="Total Invoiced (INR)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collectedRupees" name="Total Collected (INR)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receivables Aging Analysis */}
      <Card className="border-border dark:border-input/10 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Accounts Receivable Aging Schedule</CardTitle>
          <CardDescription className="text-xs">
            Aging analysis of open invoices awaiting customer payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {agingBuckets.map((bucket, idx) => {
              const isUrgent = idx >= 2;
              return (
                <div
                  key={bucket.range}
                  className="p-3.5 rounded-lg border border-border bg-card space-y-1"
                >
                  <p className="text-xs font-medium text-muted-foreground">{bucket.range}</p>
                  <p className={`text-lg font-bold ${isUrgent && bucket.amountPaise > 0 ? "text-rose-500" : "text-foreground"}`}>
                    {formatINR(bucket.amountPaise)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {bucket.invoiceCount} open {bucket.invoiceCount === 1 ? "invoice" : "invoices"}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Collections Ledger */}
      <Card className="border-border dark:border-input/10 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Payment Transactions</CardTitle>
          <CardDescription className="text-xs">
            Latest received customer transactions verified in the billing ledger
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Receipt Number</TableHead>
                  <TableHead className="text-xs font-semibold">Invoice Number</TableHead>
                  <TableHead className="text-xs font-semibold">Customer Account</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Amount Paid</TableHead>
                  <TableHead className="text-xs font-semibold">Method</TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">Recorded By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPaymentsSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                      No recent payment transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentPaymentsSummary.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-mono font-medium">{p.paymentNumber}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{p.invoiceNumber}</TableCell>
                      <TableCell className="text-xs font-medium text-foreground">{p.customerName}</TableCell>
                      <TableCell className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 text-right">
                        {formatINR(p.amountPaise)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {p.paymentMethod.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.receivedByName}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
