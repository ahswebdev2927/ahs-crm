import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getPayments,
  recordPayment,
} from "@/features/payments/services/payment.service";

/**
 * GET /api/payments
 * Lists payment transactions ledger with filters.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const result = await getPayments(user, queryParams as any);

  return successResponse({
    statusCode: 200,
    message: "Payment transactions retrieved successfully.",
    data: {
      ...result,
      payments: result.items,
    },
  });
});

/**
 * POST /api/payments
 * Records a customer payment against an invoice inside an atomic transaction.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const body = await request.json();

  const payment = await recordPayment(user, body);

  return successResponse({
    statusCode: 201,
    message: "Payment recorded successfully.",
    data: { payment },
  });
});
