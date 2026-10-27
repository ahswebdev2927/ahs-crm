import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getUserNotifications } from "@/features/notifications/services/notification.service";
import { notificationQuerySchema } from "@/features/notifications/schemas/notification.schema";

/**
 * GET /api/notifications
 * Lists paginated notifications for the authenticated user with optional category, read status, and search filters.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();

  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());
  const parsed = notificationQuerySchema.parse(rawParams);

  const result = await getUserNotifications(user.id, parsed);

  return successResponse({
    statusCode: 200,
    message: "Notifications retrieved successfully.",
    data: result,
  });
});
