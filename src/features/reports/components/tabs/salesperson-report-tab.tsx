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
import { Button } from "@/components/ui/button";
import { formatINR, formatAxisINR } from "@/lib/formatters";
import type { SalespersonReportData } from "../../types/reports.types";
import { PhoneCall, Calendar, MapPin, CheckCircle2, Trophy, UserCheck } from "lucide-react";

interface SalespersonReportTabProps {
  data: SalespersonReportData;
  onSelectUser?: (userId: string) => void;
  selectedUserId?: string;
}

/**
 * Functional component rendering the Salesperson Leaderboard and Drilldown report.
 */
export function SalespersonReportTab({
  data,
  onSelectUser,
  selectedUserId,
}: SalespersonReportTabProps) {
  const { leaderboard, selectedSalespersonDetails } = data;

  // Transform leaderboard for chart
  const chartData = leaderboard.slice(0, 10).map((rep) => ({
    name: rep.name.split(" ")[0], // First name for chart tick
    fullName: rep.name,
    revenueRupees: rep.revenuePaise / 100,
    collectionsRupees: rep.collectionsPaise / 100,
    wonCount: rep.wonCount,
    conversionRate: rep.conversionRate,
  }));

  return (
    <div className="space-y-6">
      {/* Top Leaderboard Chart */}
      <Card className="border-border dark:border-input/10 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Sales Representative Performance Leaderboard
          </CardTitle>
          <CardDescription className="text-xs">
            Comparative revenue booked versus actual collections across representatives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No active sales representative records available for the selected range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 15, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tickFormatter={(val) => formatAxisINR(val)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover text-popover-foreground rounded-lg border border-border p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-semibold">{d.fullName}</p>
                          <p className="text-blue-500">Revenue: {formatINR(d.revenueRupees * 100)}</p>
                          <p className="text-emerald-500">Collections: {formatINR(d.collectionsRupees * 100)}</p>
                          <p className="text-muted-foreground">{d.wonCount} won deals ({d.conversionRate}% conversion)</p>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="revenueRupees" name="Revenue Booked (INR)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collectionsRupees" name="Collections (INR)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card className="border-border dark:border-input/10 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Representative Performance Table</CardTitle>
          <CardDescription className="text-xs">
            Complete breakdown of sales productivity, follow-ups, appointments, and collections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Representative</TableHead>
                  <TableHead className="text-xs font-semibold">Role</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Leads</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Won</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Conversion</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Revenue</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Collections</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Activities Done</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-xs text-muted-foreground">
                      No representative performance records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  leaderboard.map((rep) => {
                    const isSelected = selectedUserId === rep.userId;
                    return (
                      <TableRow key={rep.userId} className={isSelected ? "bg-muted/50" : undefined}>
                        <TableCell className="text-xs">
                          <p className="font-semibold text-foreground">{rep.name}</p>
                          <p className="text-[11px] text-muted-foreground">{rep.email}</p>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {rep.roleName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-right">{rep.leadsCount}</TableCell>
                        <TableCell className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 text-right">
                          {rep.wonCount}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          <span className="font-medium">{rep.conversionRate}%</span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-right">
                          {formatINR(rep.revenuePaise)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 text-right">
                          {formatINR(rep.collectionsPaise)}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                            <span title="Follow-ups completed" className="flex items-center gap-0.5">
                              <PhoneCall className="h-3 w-3 text-blue-500" />
                              {rep.followupsCompleted}
                            </span>
                            <span title="Appointments completed" className="flex items-center gap-0.5">
                              <Calendar className="h-3 w-3 text-amber-500" />
                              {rep.appointmentsCompleted}
                            </span>
                            <span title="Field visits completed" className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3 text-indigo-500" />
                              {rep.fieldVisitsCompleted}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {onSelectUser && (
                            <Button
                              variant={isSelected ? "secondary" : "ghost"}
                              size="xs"
                              className="h-7 text-xs"
                              onClick={() => onSelectUser(rep.userId)}
                            >
                              <UserCheck className="h-3.5 w-3.5 mr-1" />
                              Drilldown
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Individual Representative Drilldown */}
      {selectedSalespersonDetails && (
        <Card className="border-border dark:border-input/10 shadow-xs bg-muted/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Individual Drilldown: {selectedSalespersonDetails.user.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedSalespersonDetails.user.roleName} • {selectedSalespersonDetails.user.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Operational Activities Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                  <PhoneCall className="h-4 w-4 text-blue-500" />
                  Follow-ups Completed
                </div>
                <div className="text-xl font-bold">
                  {selectedSalespersonDetails.activityBreakdown.followupsCompleted} / {selectedSalespersonDetails.activityBreakdown.followupsTotal}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  Appointments Completed
                </div>
                <div className="text-xl font-bold">
                  {selectedSalespersonDetails.activityBreakdown.appointmentsCompleted} / {selectedSalespersonDetails.activityBreakdown.appointmentsTotal}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                  <MapPin className="h-4 w-4 text-indigo-500" />
                  Field Visits Completed
                </div>
                <div className="text-xl font-bold">
                  {selectedSalespersonDetails.activityBreakdown.fieldVisitsCompleted} / {selectedSalespersonDetails.activityBreakdown.fieldVisitsTotal}
                </div>
              </div>
            </div>

            {/* Recent Won Deals */}
            <div>
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Recent Won Contracts in Period
              </h4>
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs">Deal / Proposal</TableHead>
                      <TableHead className="text-xs">Client Account</TableHead>
                      <TableHead className="text-xs text-right">Value (INR)</TableHead>
                      <TableHead className="text-xs text-right">Closed Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSalespersonDetails.recentWonDeals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-xs text-muted-foreground">
                          No won deals recorded for this representative in this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedSalespersonDetails.recentWonDeals.map((deal) => (
                        <TableRow key={deal.leadId}>
                          <TableCell className="text-xs font-medium">{deal.leadTitle}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{deal.customerName}</TableCell>
                          <TableCell className="text-xs font-semibold text-right">
                            {formatINR(deal.valuePaise)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground text-right">
                            {new Date(deal.wonAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
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
      )}
    </div>
  );
}
