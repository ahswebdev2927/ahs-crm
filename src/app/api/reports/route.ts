import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { reportsFilterSchema } from "@/features/reports/schemas/reports-filter.schema";
import { getReportsData } from "@/features/reports/services/reports.service";

/**
 * GET /api/reports
 * Fetches authoritative real-time report metrics based on tab, preset,
 * custom date bounds, and authorized user/team scoping.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  const rawParams = {
    tab: searchParams.get("tab") || undefined,
    preset: searchParams.get("preset") || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    teamId: searchParams.get("teamId") || undefined,
    userId: searchParams.get("userId") || undefined,
  };

  const parsed = reportsFilterSchema.parse(rawParams);
  const data = await getReportsData(parsed);

  return NextResponse.json({
    success: true,
    data,
  });
});
