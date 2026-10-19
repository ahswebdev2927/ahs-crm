import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getInvoice,
  updateInvoice,
} from "@/features/invoices/services/invoice.service";

/**
 * GET /api/invoices/[id]
 * Get single invoice detail with items and recorded payment history.
 */
export const GET = withErrorHandling(async (_request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const invoice = await getInvoice(user, id);

  return successResponse({
    statusCode: 200,
    message: "Invoice retrieved successfully.",
    data: { invoice },
  });
});

/**
 * PATCH /api/invoices/[id]
 * Update an unpaid invoice with zero recorded payments.
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const invoice = await updateInvoice(user, id, body);

  return successResponse({
    statusCode: 200,
    message: "Invoice updated successfully.",
    data: { invoice },
  });
});
