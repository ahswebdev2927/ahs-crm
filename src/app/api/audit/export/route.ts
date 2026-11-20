import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { exportAuditLogsCsv } from "@/features/audit/services/audit.service";
import { getClientIp, checkRateLimit } from "@/lib/security/rate-limit";

/**
 * GET /api/audit/export
 * Downloads RFC 4180 compliant CSV export containing ONLY records matching
 * the active filter criteria. Strictly restricted to SuperAdmin users.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();

  const clientIp = await getClientIp();
  await checkRateLimit({
    key: "export-audit",
    identifier: `${user.id}:${clientIp}`,
    limit: 10,
    windowMs: 60 * 1000,
    message: "Audit export rate limit exceeded. Please wait a minute before exporting again.",
  });

  const { searchParams } = new URL(request.url);

  const queryParams = {
    entityType: searchParams.get("entityType") || undefined,
    action: searchParams.get("action") || undefined,
    userId: searchParams.get("userId") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    search: searchParams.get("search") || undefined,
  };

  const { filename, csv } = await exportAuditLogsCsv(user, queryParams);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
});
