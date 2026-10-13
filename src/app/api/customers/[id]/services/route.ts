import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getCustomerSubscriptions,
  assignService,
} from "@/features/services";

export const GET = withErrorHandling(
  async (_request: NextRequest, context) => {
    const user = await requireAuth();
    const rawParams = await context?.params;
    const customerId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

    const subscriptions = await getCustomerSubscriptions(user, customerId);

    return successResponse({
      statusCode: 200,
      message: "Customer subscriptions retrieved successfully.",
      data: { subscriptions },
    });
  }
);

export const POST = withErrorHandling(
  async (request: NextRequest, context) => {
    const user = await requireAuth();
    const rawParams = await context?.params;
    const customerId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
    const body = await request.json();

    const subscription = await assignService(user, {
      ...body,
      customerId,
    });

    return successResponse({
      statusCode: 201,
      message: "Service assigned to customer successfully.",
      data: { subscription },
    });
  }
);

