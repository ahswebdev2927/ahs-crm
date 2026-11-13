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
import type { ManagerReportData } from "../../types/reports.types";
import { Users, Target, CheckCircle2, DollarSign, Wallet, Activity } from "lucide-react";

interface ManagerReportTabProps {
  data: ManagerReportData;
}

/**
 * Functional component rendering the Manager / Team Performance Report.
 */
export function ManagerReportTab({ data }: ManagerReportTabProps) {
  const { teamSummary, teamComparativeTrend, memberActivityMatrix } = data;

  const chartData = teamComparativeTrend.map((t) => ({
    period: t.period,
    leads: t.leads,
    won: t.won,
    revenueRupees: t.revenuePaise / 100,
  }));

  return (
    <div className="space-y-6">
      {/* Team Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              Team Members
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">
              {teamSummary.membersCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            {teamSummary.teamName}
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
              <Target className="h-3.5 w-3.5 text-indigo-500" />
              Team Leads
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">
              {teamSummary.totalLeads}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Assigned to team
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Won Deals
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
              {teamSummary.wonLeads}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Closed conversions
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-amber-500" />
              Conversion Rate
            </CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">
              {teamSummary.conversionRate}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Win efficiency
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5 text-blue-500" />
              Team Revenue
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 truncate">
              {formatINR(teamSummary.totalRevenuePaise)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Booked proposals
          </CardContent>
        </Card>

        <Card className="border-border dark:border-input/10 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center gap-1 font-medium text-muted-foreground">
              <Wallet className="h-3.5 w-3.5 text-emerald-500" />
              Team Collections
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 truncate">
              {formatINR(teamSummary.totalCollectionsPaise)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Cash collected
          </CardContent>
        </Card>
      </div>

      {/* Team Productivity Trajectory Chart */}
      <Card className="border-border dark:border-input/10 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Team Productivity & Revenue Trajectory</CardTitle>
          <CardDescription className="text-xs">
            Volume of leads acquired and revenue delivered over the period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No activity data available for the team in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(val) => formatAxisINR(val)}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover text-popover-foreground rounded-lg border border-border p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-semibold">{label}</p>
                          <p className="text-blue-500">Leads: {d.leads}</p>
                          <p className="text-emerald-500">Won Deals: {d.won}</p>
                          <p className="text-amber-500">Revenue: {formatINR(d.revenueRupees * 100)}</p>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="won" name="Won Deals" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="revenueRupees" name="Revenue (INR)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Member Activity & Productivity Matrix */}
      <Card className="border-border dark:border-input/10 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Team Member Activity Matrix</CardTitle>
          <CardDescription className="text-xs">
            Direct comparison of actions, operational meetings, field visits, and sales output
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Member</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Leads</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Calls & Follow-ups</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Appointments</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Site Visits</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Tasks Done</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Revenue Contributed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberActivityMatrix.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                      No team members found in the selected team.
                    </TableCell>
                  </TableRow>
                ) : (
                  memberActivityMatrix.map((m) => (
                    <TableRow key={m.userId}>
                      <TableCell className="text-xs font-medium text-foreground">{m.name}</TableCell>
                      <TableCell className="text-xs font-semibold text-right">{m.leads}</TableCell>
                      <TableCell className="text-xs text-right">{m.calls}</TableCell>
                      <TableCell className="text-xs text-right">{m.meetings}</TableCell>
                      <TableCell className="text-xs text-right">{m.visits}</TableCell>
                      <TableCell className="text-xs text-right">
                        <Badge variant="outline" className="text-[10px]">
                          {m.tasksDone} done
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-right text-emerald-600 dark:text-emerald-400">
                        {formatINR(m.revenuePaise)}
                      </TableCell>
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
