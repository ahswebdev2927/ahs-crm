import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getPaymentsStats } from "@/features/payments/services/payment.service";

/**
 * GET /api/payments/stats
 * Aggregate collection metrics (Total, Today, This Month, Payment Methods).
 */
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const user = await requireAuth();
  const stats = await getPaymentsStats(user);

  return successResponse({
    statusCode: 200,
    message: "Payment statistics retrieved successfully.",
    data: { stats },
  });
});
