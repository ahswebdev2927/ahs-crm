"use client";

import * as React from "react";
import { format, subDays, startOfMonth, subMonths } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardTeamMemberPerformance } from "@/features/dashboard/types/dashboard-scope.types";

export type TeamPerformancePreset = "7d" | "30d" | "this_month" | "3m" | "6m" | "12m" | "custom";

interface TeamPerformanceTableProps {
  data?: DashboardTeamMemberPerformance[];
  onDateRangeChange?: (range: TeamPerformancePreset, customRange?: DateRange) => void;
}

export function TeamPerformanceTable({ data, onDateRangeChange }: TeamPerformanceTableProps) {
  const [activePreset, setActivePreset] = React.useState<TeamPerformancePreset>("30d");

  // Date Range Picker state
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: subDays(now, 30),
      to: now,
    };
  });

  const handlePresetSelect = (preset: TeamPerformancePreset) => {
    setActivePreset(preset);
    const now = new Date();
    let fromDate: Date;

    switch (preset) {
      case "7d":
        fromDate = subDays(now, 7);
        break;
      case "30d":
        fromDate = subDays(now, 30);
        break;
      case "this_month":
        fromDate = startOfMonth(now);
        break;
      case "3m":
        fromDate = subMonths(now, 3);
        break;
      case "6m":
        fromDate = subMonths(now, 6);
        break;
      case "12m":
        fromDate = subMonths(now, 12);
        break;
      default:
        return;
    }

    const newRange = { from: fromDate, to: now };
    setDateRange(newRange);
    if (onDateRangeChange) {
      onDateRangeChange(preset, newRange);
    }
  };

  const handleCustomRangeChange = (range?: DateRange) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setActivePreset("custom");
      if (onDateRangeChange) {
        onDateRangeChange("custom", range);
      }
    }
  };

  const hasData = data && data.length > 0;

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Team Sales Performance</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Salesperson metrics across leads, won deals, revenue, and conversion rate
          </CardDescription>
        </div>

        {/* Duration Selection Toggles & Date Range Picker */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month & Preset Toggles */}
          <div className="inline-flex rounded-md bg-muted p-0.5 text-xs">
            {(["7d", "30d", "this_month", "3m", "6m", "12m"] as const).map((p) => {
              const labels: Record<string, string> = {
                "7d": "7D",
                "30d": "30D",
                this_month: "This Month",
                "3m": "3M",
                "6m": "6M",
                "12m": "12M",
              };
              return (
                <Button
                  key={p}
                  variant={activePreset === p ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => handlePresetSelect(p)}
                >
                  {labels[p]}
                </Button>
              );
            })}
          </div>

          {/* Custom Date Range Picker */}
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={handleCustomRangeChange}
            className="h-7 text-xs"
          />
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">No team members assigned</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Team performance table renders sales team member metrics for the selected duration.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Salesperson</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Won Deals</TableHead>
                  <TableHead className="text-right">Revenue (₹)</TableHead>
                  <TableHead className="text-right">Conversion %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-right">{member.leadsCount}</TableCell>
                    <TableCell className="text-right">{member.wonCount}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{member.revenue.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">{member.conversionRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
