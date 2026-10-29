import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { sendNotification } from "@/features/notifications/services/notification.service";
import type { NotificationCategory } from "@/features/notifications/types";

/**
 * POST /api/notifications/test
 * Sends an instant test notification to the authenticated user across active channels.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();

  let body: { category?: NotificationCategory; title?: string; message?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional
  }

  const category: NotificationCategory = body.category || "leads";
  const title = body.title || "🔔 Test Notification";
  const message =
    body.message || "This is a real-time verification alert from AHS CRM Notification Center.";

  await sendNotification({
    recipientId: user.id,
    title,
    message,
    category,
    type: "system:test",
    actionUrl: "/notifications",
  });

  return successResponse({
    statusCode: 200,
    message: "Test notification dispatched successfully.",
    data: {
      recipientId: user.id,
      title,
      category,
    },
  });
});
