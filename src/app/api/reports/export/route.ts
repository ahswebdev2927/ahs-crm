import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { reportsFilterSchema } from "@/features/reports/schemas/reports-filter.schema";
import { getReportsData } from "@/features/reports/services/reports.service";
import { generateReportCsv } from "@/features/reports/services/reports-export.service";

/**
 * GET /api/reports/export
 * Downloads sanitized RFC 4180 CSV export files for the requested report tab.
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
  const { filename, csv } = generateReportCsv(data);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
});
