import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getAuditLogs } from "@/features/audit/services/audit.service";

/**
 * GET /api/audit/logs
 * Retrieves paginated audit logs filtered by entity, action, date, or search keyword.
 * Strictly restricted to SuperAdmin users.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);

  const queryParams = {
    page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    entityType: searchParams.get("entityType") || undefined,
    action: searchParams.get("action") || undefined,
    userId: searchParams.get("userId") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    search: searchParams.get("search") || undefined,
  };

  const result = await getAuditLogs(user, queryParams);

  return successResponse({
    statusCode: 200,
    message: "Audit logs retrieved successfully.",
    data: result,
  });
});
