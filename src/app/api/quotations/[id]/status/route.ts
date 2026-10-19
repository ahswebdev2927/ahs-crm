import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { updateQuotationStatus } from "@/features/quotations/services/quotation.service";

/**
 * POST /api/quotations/[id]/status
 * Update quotation lifecycle status (e.g., mark as sent, accepted, declined, expired).
 */
export const POST = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const quotation = await updateQuotationStatus(user, id, body);

  return successResponse({
    statusCode: 200,
    message: `Quotation status updated to ${quotation.status}.`,
    data: { quotation },
  });
});
