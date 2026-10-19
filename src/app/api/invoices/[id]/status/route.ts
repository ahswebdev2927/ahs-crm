import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { updateInvoiceStatus } from "@/features/invoices/services/invoice.service";

/**
 * POST /api/invoices/[id]/status
 * Update invoice status manually (e.g. void or cancel).
 */
export const POST = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const invoice = await updateInvoiceStatus(user, id, body);

  return successResponse({
    statusCode: 200,
    message: `Invoice status updated to ${invoice.status}.`,
    data: { invoice },
  });
});
