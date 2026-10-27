"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearReadNotifications,
  updateUserPreferences,
} from "../services/notification.service";
import {
  markNotificationReadSchema,
  updateNotificationPreferencesSchema,
  type UpdatePreferencesInput,
} from "../schemas/notification.schema";

/**
 * Server Action: Marks a single notification as read for the current user
 */
export async function markNotificationReadAction(id: string) {
  const user = await requireAuth();
  const parsed = markNotificationReadSchema.parse({ id });

  const updated = await markNotificationAsRead(parsed.id, user.id);
  revalidatePath("/notifications");

  return { success: updated };
}

/**
 * Server Action: Marks all unread notifications as read for the current user
 */
export async function markAllNotificationsReadAction() {
  const user = await requireAuth();

  const count = await markAllNotificationsAsRead(user.id);
  revalidatePath("/notifications");

  return { success: true, count };
}

/**
 * Server Action: Deletes all read notifications for the current user
 */
export async function clearReadNotificationsAction() {
  const user = await requireAuth();

  const count = await clearReadNotifications(user.id);
  revalidatePath("/notifications");

  return { success: true, count };
}

/**
 * Server Action: Updates notification preferences (channels & categories) for the current user
 */
export async function updateNotificationPreferencesAction(
  input: UpdatePreferencesInput
) {
  const user = await requireAuth();
  const parsed = updateNotificationPreferencesSchema.parse(input);

  await updateUserPreferences(user.id, parsed.preferences);

  return { success: true };
}
