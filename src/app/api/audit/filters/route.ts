import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getAuditFilterMetadata } from "@/features/audit/services/audit.service";

/**
 * GET /api/audit/filters
 * Retrieves distinct action types, entity types, and actors for the audit filter toolbar.
 * Strictly restricted to SuperAdmin users.
 */
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const user = await requireAuth();
  const filters = await getAuditFilterMetadata(user);

  return successResponse({
    statusCode: 200,
    message: "Audit filter metadata retrieved successfully.",
    data: filters,
  });
});
