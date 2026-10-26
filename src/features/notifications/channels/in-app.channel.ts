import type { NotificationChannel } from "./channel.interface";
import type { NotificationPayload, ChannelSendResult } from "../types";
import { createNotificationRecord } from "../repositories/notification.repository";
import { logger } from "@/lib/logger";

/**
 * Pure function to dispatch In-App notifications.
 * Persists notification records into the database for the interactive bell menu
 * and dedicated /notifications inbox.
 */
export async function sendInAppNotification(
  payload: NotificationPayload
): Promise<ChannelSendResult> {
  try {
    await createNotificationRecord({
      recipientId: payload.recipientId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      category: payload.category,
      actionUrl: payload.actionUrl ?? null,
      referenceId: payload.referenceId ?? null,
    });

    return {
      channel: "in_app",
      success: true,
    };
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(
      { err, recipientId: payload.recipientId, type: payload.type },
      "InAppChannel failed to persist notification"
    );
    return {
      channel: "in_app",
      success: false,
      error: error.message,
    };
  }
}

export const inAppChannel: NotificationChannel = {
  id: "in_app",
  send: sendInAppNotification,
};
