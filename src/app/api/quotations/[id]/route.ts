import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getQuotation,
  updateQuotation,
} from "@/features/quotations/services/quotation.service";

/**
 * GET /api/quotations/[id]
 * Get single quotation detail with line items and relations.
 */
export const GET = withErrorHandling(async (_request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const quotation = await getQuotation(user, id);

  return successResponse({
    statusCode: 200,
    message: "Quotation retrieved successfully.",
    data: { quotation },
  });
});

/**
 * PATCH /api/quotations/[id]
 * Update a draft quotation's items, terms, or notes.
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const quotation = await updateQuotation(user, id, body);

  return successResponse({
    statusCode: 200,
    message: "Quotation updated successfully.",
    data: { quotation },
  });
});
