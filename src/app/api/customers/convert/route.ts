import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { convertLeadToCustomer } from "@/features/customers/services/customer.service";

/**
 * POST /api/customers/convert
 * Atomically converts an active/won lead into a customer record,
 * re-linking existing historical appointments, visits, follow-ups, and attachments.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const body = await request.json();

  const customer = await convertLeadToCustomer(user, body);

  return successResponse({
    statusCode: 201,
    message: "Lead successfully converted to customer.",
    data: { customer },
  });
});
