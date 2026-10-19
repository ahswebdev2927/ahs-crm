import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { updateInvoiceStatus } from "@/features/invoices/services/invoice.service";

/**
 * Update invoice status manually (e.g. void or cancel).
 * Supports both POST and PATCH methods.
 */
const handleStatusUpdate = async (request: NextRequest, context: any) => {
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
};

export const POST = withErrorHandling(handleStatusUpdate);
export const PATCH = withErrorHandling(handleStatusUpdate);
