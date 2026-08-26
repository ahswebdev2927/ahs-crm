"use client";

import * as React from "react";
import { format, subDays, startOfMonth, subMonths, isAfter, isBefore } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { DashboardRevenueTrendPoint } from "@/features/dashboard/types/dashboard-scope.types";

interface RevenueTrendChartProps {
  data: DashboardRevenueTrendPoint[];
}

export type PresetRange = "7d" | "30d" | "this_month" | "3m" | "6m" | "12m" | "custom";

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const [chartType, setChartType] = React.useState<"area" | "line">("area");
  const [activePreset, setActivePreset] = React.useState<PresetRange>("30d");

  // Date Range Picker state
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: subDays(now, 30),
      to: now,
    };
  });

  const handlePresetSelect = (preset: PresetRange) => {
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

    setDateRange({ from: fromDate, to: now });
  };

  const handleCustomRangeChange = (range?: DateRange) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setActivePreset("custom");
    }
  };

  const hasData = data && data.length > 0 && data.some((d) => d.revenue > 0 || d.collected > 0);

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Revenue & Collections Trend</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Track billed revenue versus actual payment collections
          </CardDescription>
        </div>

        {/* Chart Controls & Date Range Picker */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Preset Buttons */}
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
              const isSelected = activePreset === p;

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePresetSelect(p)}
                  className={`rounded-sm px-1.5 py-0.5 text-[11px] sm:text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          {/* From Date - To Date Range Picker */}
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={handleCustomRangeChange}
            placeholder="From Date - To Date"
          />

          {/* Area / Line Toggle */}
          <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setChartType("area")}
              className={`rounded-sm px-2 py-0.5 text-xs font-medium transition-all ${
                chartType === "area" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Area
            </button>
            <button
              type="button"
              onClick={() => setChartType("line")}
              className={`rounded-sm px-2 py-0.5 text-xs font-medium transition-all ${
                chartType === "line" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Line
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!hasData ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">No financial trend data available</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Revenue data will populate as invoices and payments are recorded.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="Billed Revenue (₹)"
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorCollected)"
                    name="Collected (₹)"
                  />
                </AreaChart>
              ) : (
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
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Billed Revenue (₹)"
                  />
                  <Line
                    type="monotone"
                    dataKey="collected"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Collected (₹)"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
