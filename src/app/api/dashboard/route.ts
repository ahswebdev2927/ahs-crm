import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { getDashboardData } from "@/features/dashboard/services/dashboard.service";
import type { DashboardDateRange } from "@/features/dashboard/types/dashboard-scope.types";

const dashboardQuerySchema = z.object({
  scope: z.enum(["business", "team", "personal"]).optional(),
  dateRange: z
    .enum(["today", "7d", "30d", "this_month", "last_month", "3m", "6m", "12m"])
    .optional()
    .default("30d"),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const rawParams = {
    scope: searchParams.get("scope") || undefined,
    dateRange: searchParams.get("dateRange") || undefined,
  };

  const parsed = dashboardQuerySchema.parse(rawParams);

  const data = await getDashboardData(parsed.scope, parsed.dateRange as DashboardDateRange);

  return NextResponse.json({
    success: true,
    data,
  });
});
