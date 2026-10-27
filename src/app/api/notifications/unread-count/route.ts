import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getUnreadNotificationCount } from "@/features/notifications/services/notification.service";

/**
 * GET /api/notifications/unread-count
 * Lightweight scalar endpoint for 30s background polling and live navbar badge syncing.
 */
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const user = await requireAuth();

  const unreadCount = await getUnreadNotificationCount(user.id);

  return successResponse({
    statusCode: 200,
    message: "Unread count retrieved successfully.",
    data: { unreadCount },
  });
});
