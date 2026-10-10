import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getCustomers,
  createCustomer,
} from "@/features/customers/services/customer.service";

/**
 * GET /api/customers
 * Returns paginated, searchable, and filtered list of customers based on user permissions and data visibility.
 * Backward compatibility preserved: returns data.items and data.customers.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const result = await getCustomers(user, queryParams as any);

  return successResponse({
    statusCode: 200,
    message: "Customers retrieved successfully.",
    data: {
      ...result,
      customers: result.items,
    },
  });
});

/**
 * POST /api/customers
 * Creates a direct external customer (bypassing the lead pipeline).
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const body = await request.json();

  const customer = await createCustomer(user, body);

  return successResponse({
    statusCode: 201,
    message: "Customer created successfully.",
    data: { customer },
  });
});
