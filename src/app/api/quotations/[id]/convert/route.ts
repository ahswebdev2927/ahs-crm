import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { convertQuotationToInvoice } from "@/features/invoices/services/invoice.service";

/**
 * POST /api/quotations/[id]/convert
 * Converts an accepted quotation into an official customer invoice.
 */
export const POST = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const invoice = await convertQuotationToInvoice(user, id, body);

  return successResponse({
    statusCode: 201,
    message: "Quotation converted to invoice successfully.",
    data: { invoice },
  });
});
