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
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatAxisINR } from "@/lib/formatters";
import type { SalesReportData } from "../../types/reports.types";
import { Target, CheckCircle2, XCircle, TrendingUp, DollarSign, Award } from "lucide-react";

interface SalesReportTabProps {
  data: SalesReportData;
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

/**
 * Functional component rendering the Sales Performance Report tab.
 */
export function SalesReportTab({ data }: SalesReportTabProps) {
  const { kpis, leadsAndRevenueTrend, pipelineStageDistribution, leadsBySource } = data;

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
              <Target className="h-3.5 w-3.5 text-blue-500" />
              Total Leads
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">
              {kpis.leadsCreated.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Created in period
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Deals Won
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
              {kpis.dealsWon.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Closed converted
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-rose-500">
              <XCircle className="h-3.5 w-3.5" />
              Deals Lost
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-rose-500 mt-1">
              {kpis.dealsLost.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Lost / dropped
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
              Conversion Rate
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">
              {kpis.conversionRate}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Win efficiency
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              Total Revenue
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 truncate">
              {formatINR(kpis.totalRevenuePaise)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Closed proposals
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
              <Award className="h-3.5 w-3.5 text-amber-500" />
              Avg Deal Size
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 truncate">
              {formatINR(kpis.averageDealValuePaise)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Per won conversion
          </CardContent>
        </Card>
      </div>

      {/* Main Charts: Leads & Deals Trend + Pipeline Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <Card className="lg:col-span-2 border-border dark:border-input/10 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Leads & Won Deals Trajectory</CardTitle>
            <CardDescription className="text-xs">
              Daily or monthly trajectory of new leads captured versus deals successfully closed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              {leadsAndRevenueTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No activity data recorded in the selected date range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={leadsAndRevenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-popover text-popover-foreground rounded-lg border border-border p-2.5 shadow-md text-xs space-y-1">
                            <p className="font-semibold text-foreground">{label}</p>
                            <p className="text-blue-500 font-medium">Leads Created: {payload[0]?.value}</p>
                            <p className="text-emerald-500 font-medium">Deals Won: {payload[1]?.value}</p>
                          </div>
                        );
                      }}
                    />
                    <Area type="monotone" dataKey="leadsCreated" name="Leads Created" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
                    <Area type="monotone" dataKey="dealsWon" name="Deals Won" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorWon)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leads by Source Pie Chart */}
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Lead Sources</CardTitle>
            <CardDescription className="text-xs">
              Origination channel breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full flex flex-col items-center justify-center">
              {leadsBySource.length === 0 ? (
                <div className="text-sm text-muted-foreground">No source data available</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={leadsBySource}
                        dataKey="count"
                        nameKey="source"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {leadsBySource.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-popover text-popover-foreground rounded-lg border border-border p-2 shadow-md text-xs">
                              <p className="font-semibold">{d.source}</p>
                              <p className="text-muted-foreground">{d.count} leads ({d.conversionRate}% won)</p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-full mt-2 grid grid-cols-2 gap-1 text-[11px]">
                    {leadsBySource.map((s, idx) => (
                      <div key={s.source} className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="truncate text-muted-foreground">{s.source}</span>
                        <span className="font-semibold ml-auto">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Funnel & Stage Distribution */}
      <Card className="border-border dark:border-input/10 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Pipeline Funnel & Conversion Health</CardTitle>
          <CardDescription className="text-xs">
            Volume of leads currently in each stage and drop-off / conversion metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineStageDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="stageName" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover text-popover-foreground rounded-lg border border-border p-2 shadow-md text-xs">
                        <p className="font-semibold">{d.stageName}</p>
                        <p>Total Leads: {d.leadCount}</p>
                        {d.conversionRateToNext !== undefined && (
                          <p className="text-muted-foreground">Progression to Next: {d.conversionRateToNext}%</p>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="leadCount" radius={[4, 4, 0, 0]}>
                  {pipelineStageDistribution.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.stageColor || "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Stage Order</TableHead>
                  <TableHead className="text-xs font-semibold">Stage Name</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Lead Count</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Progression Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelineStageDistribution.map((stage) => (
                  <TableRow key={stage.stageId}>
                    <TableCell className="text-xs font-mono text-muted-foreground">#{stage.order}</TableCell>
                    <TableCell className="text-xs font-medium flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.stageColor }} />
                      {stage.stageName}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-right">{stage.leadCount}</TableCell>
                    <TableCell className="text-xs text-right">
                      {stage.conversionRateToNext !== undefined ? (
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {stage.conversionRateToNext}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
