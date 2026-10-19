import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getQuotationsStats } from "@/features/quotations/services/quotation.service";

/**
 * GET /api/quotations/stats
 * Aggregate proposal KPIs (Drafts, Sent, Accepted, Pipeline Value, Conversion).
 */
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const user = await requireAuth();
  const stats = await getQuotationsStats(user);

  return successResponse({
    statusCode: 200,
    message: "Quotation statistics retrieved successfully.",
    data: { stats },
  });
});
