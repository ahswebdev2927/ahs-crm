import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { deleteSubscriptionByEndpoint } from "@/features/notifications/repositories/push-subscription.repository";
import { unsubscribePushSchema } from "@/features/notifications/schemas/notification.schema";

/**
 * DELETE /api/notifications/push/unsubscribe
 * Removes a browser Web Push subscription endpoint on user opt-out or browser logout.
 */
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  await requireAuth();

  const body = await request.json();
  const parsed = unsubscribePushSchema.parse(body);

  const deletedCount = await deleteSubscriptionByEndpoint(parsed.endpoint);

  return successResponse({
    statusCode: 200,
    message: "Push notification subscription removed successfully.",
    data: { deletedCount },
  });
});
