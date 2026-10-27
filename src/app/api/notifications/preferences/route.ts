import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/features/notifications/services/notification.service";
import { updateNotificationPreferencesSchema } from "@/features/notifications/schemas/notification.schema";

/**
 * GET /api/notifications/preferences
 * Returns the current user's category-channel notification preferences map.
 */
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const user = await requireAuth();

  const preferences = await getUserPreferences(user.id);

  return successResponse({
    statusCode: 200,
    message: "Notification preferences retrieved successfully.",
    data: { preferences },
  });
});

/**
 * PUT /api/notifications/preferences
 * Batch updates the user's category-channel notification preferences.
 */
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();

  const body = await request.json();
  const parsed = updateNotificationPreferencesSchema.parse(body);

  await updateUserPreferences(user.id, parsed.preferences);

  const updatedPreferences = await getUserPreferences(user.id);

  return successResponse({
    statusCode: 200,
    message: "Notification preferences updated successfully.",
    data: { preferences: updatedPreferences },
  });
});
