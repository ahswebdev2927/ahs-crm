import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { upsertPushSubscription } from "@/features/notifications/repositories/push-subscription.repository";
import { pushSubscriptionSchema } from "@/features/notifications/schemas/notification.schema";

/**
 * POST /api/notifications/push/subscribe
 * Registers or updates a browser Web Push subscription for the authenticated user.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();

  const body = await request.json();
  const parsed = pushSubscriptionSchema.parse(body);

  const subscription = await upsertPushSubscription(user.id, parsed);

  return successResponse({
    statusCode: 200,
    message: "Push notification subscription registered successfully.",
    data: {
      id: subscription.id,
      endpoint: subscription.endpoint,
    },
  });
});
