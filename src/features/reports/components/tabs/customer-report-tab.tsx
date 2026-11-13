"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/formatters";
import type { CustomerReportData } from "../../types/reports.types";
import { Users, UserPlus, Briefcase, Award } from "lucide-react";

interface CustomerReportTabProps {
  data: CustomerReportData;
}

/**
 * Functional component rendering the Customer Growth & Services Report.
 */
export function CustomerReportTab({ data }: CustomerReportTabProps) {
  const { kpis, customerGrowthTrend, topServicesPurchased } = data;

  return (
    <div className="space-y-6">
      {/* Customer KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              Total Accounts
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">
              {kpis.totalCustomers.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Active client portfolio
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <UserPlus className="h-3.5 w-3.5" />
              New Accounts
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
              +{kpis.newCustomersInPeriod.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Acquired in period
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
              Active Subscriptions
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">
              {kpis.activeContractsCount.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Ongoing service contracts
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
              <Award className="h-3.5 w-3.5 text-amber-500" />
              Avg Customer Revenue
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 truncate">
              {formatINR(kpis.averageCustomerRevenuePaise)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Cumulative per account
          </CardContent>
        </Card>
      </div>

      {/* Customer Acquisition Trajectory Area Chart */}
      <Card className="border-border dark:border-input/10 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Customer Portfolio Growth</CardTitle>
          <CardDescription className="text-xs">
            Cumulative client accounts and periodic new account acquisitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            {customerGrowthTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No customer acquisition history available for the selected range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={customerGrowthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover text-popover-foreground rounded-lg border border-border p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-semibold">{label}</p>
                          <p className="text-blue-500 font-medium">New Accounts: +{d.newCustomers}</p>
                          <p className="text-muted-foreground">Total Accounts: {d.cumulativeCustomers}</p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeCustomers"
                    name="Total Accounts"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGrowth)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Services Purchased */}
      <Card className="border-border dark:border-input/10 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Service Catalog Adoption & Revenue</CardTitle>
          <CardDescription className="text-xs">
            Most contracted service offerings ranked by customer count and revenue volume
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div className="h-64 w-full">
              {topServicesPurchased.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No active customer subscriptions recorded.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topServicesPurchased}
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="serviceName"
                      type="category"
                      width={120}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => (val.length > 16 ? `${val.substring(0, 16)}...` : val)}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover text-popover-foreground rounded-lg border border-border p-2.5 shadow-md text-xs space-y-1">
                            <p className="font-semibold">{d.serviceName}</p>
                            <p className="text-blue-500">Adoption: {d.adoptionCount} accounts</p>
                            <p className="text-emerald-500">Revenue: {formatINR(d.totalRevenuePaise)}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="adoptionCount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Service Package</TableHead>
                    <TableHead className="text-xs font-semibold">Category</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Adoption</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topServicesPurchased.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                        No service data available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    topServicesPurchased.map((s) => (
                      <TableRow key={s.serviceId}>
                        <TableCell className="text-xs font-medium text-foreground">{s.serviceName}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {s.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-right">{s.adoptionCount}</TableCell>
                        <TableCell className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 text-right">
                          {formatINR(s.totalRevenuePaise)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
