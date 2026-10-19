import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getQuotations,
  createQuotation,
} from "@/features/quotations/services/quotation.service";

/**
 * GET /api/quotations
 * List quotations with server-side pagination, status filtering, and search.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const result = await getQuotations(user, queryParams as any);
  const totalPages = Math.ceil(result.total / (result.limit || 20)) || 1;

  return successResponse({
    statusCode: 200,
    message: "Quotations retrieved successfully.",
    data: {
      ...result,
      quotations: result.items,
      totalPages,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages,
      },
    },
  });
});

/**
 * POST /api/quotations
 * Generate a new proposal/quotation for a Lead or Customer.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const body = await request.json();

  const quotation = await createQuotation(user, body);

  return successResponse({
    statusCode: 201,
    message: "Quotation created successfully.",
    data: { quotation },
  });
});
