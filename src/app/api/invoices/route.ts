import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getInvoices,
  createInvoice,
} from "@/features/invoices/services/invoice.service";

/**
 * GET /api/invoices
 * Lists customer invoices with pagination, status filters, and search.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const result = await getInvoices(user, queryParams as any);

  return successResponse({
    statusCode: 200,
    message: "Invoices retrieved successfully.",
    data: {
      ...result,
      invoices: result.items,
    },
  });
});

/**
 * POST /api/invoices
 * Issues a new customer invoice (SuperAdmin and SalesManager only).
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const body = await request.json();

  const invoice = await createInvoice(user, body);

  return successResponse({
    statusCode: 201,
    message: "Invoice issued successfully.",
    data: { invoice },
  });
});
