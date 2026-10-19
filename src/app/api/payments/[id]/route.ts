import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getPayment } from "@/features/payments/services/payment.service";

/**
 * GET /api/payments/[id]
 * Get single payment transaction detail.
 */
export const GET = withErrorHandling(async (_request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const payment = await getPayment(user, id);

  return successResponse({
    statusCode: 200,
    message: "Payment retrieved successfully.",
    data: { payment },
  });
});
