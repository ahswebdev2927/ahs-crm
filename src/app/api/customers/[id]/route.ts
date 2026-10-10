import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getCustomerById,
  updateCustomer,
} from "@/features/customers/services/customer.service";

/**
 * GET /api/customers/[id]
 * Retrieves 360-degree customer details, associated lead context, and aggregated statistics.
 */
export const GET = withErrorHandling(async (_request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const customer = await getCustomerById(user, id);

  return successResponse({
    statusCode: 200,
    message: "Customer details retrieved successfully.",
    data: { customer },
  });
});

/**
 * PATCH /api/customers/[id]
 * Updates customer details, contact information, owner, or status.
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const customer = await updateCustomer(user, id, body);

  return successResponse({
    statusCode: 200,
    message: "Customer updated successfully.",
    data: { customer },
  });
});

/**
 * DELETE /api/customers/[id]
 * Deactivates or soft-archives a customer record.
 */
export const DELETE = withErrorHandling(async (_request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const customer = await updateCustomer(user, id, { status: "inactive" });

  return successResponse({
    statusCode: 200,
    message: "Customer deactivated successfully.",
    data: { customer },
  });
});
