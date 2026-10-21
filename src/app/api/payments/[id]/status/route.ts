import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { updatePaymentStatus } from "@/features/payments/services/payment.service";

/**
 * Update payment transaction status (e.g. marking as refunded or failed/reversed).
 * Supports both POST and PATCH methods.
 */
const handleStatusUpdate = async (request: NextRequest, context: any) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const payment = await updatePaymentStatus(user, id, body);

  return successResponse({
    statusCode: 200,
    message: `Payment status updated to ${payment.status}.`,
    data: { payment },
  });
};

export const POST = withErrorHandling(handleStatusUpdate);
export const PATCH = withErrorHandling(handleStatusUpdate);
