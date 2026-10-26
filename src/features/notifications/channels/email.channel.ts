import type { NotificationChannel } from "./channel.interface";
import type { NotificationPayload, ChannelSendResult } from "../types";
import { logger } from "@/lib/logger";

/**
 * Pure function to dispatch Email notifications (Extension Slot).
 * Ready to be connected to SMTP, Resend, or SendGrid in a future phase
 * without requiring any changes to CRM business logic.
 */
export async function sendEmailNotification(
  payload: NotificationPayload
): Promise<ChannelSendResult> {
  logger.debug(
    { recipientId: payload.recipientId, title: payload.title },
    "EmailChannel: Notification skipped (channel not active in current phase)"
  );

  return {
    channel: "email",
    success: true,
  };
}

export const emailChannel: NotificationChannel = {
  id: "email",
  send: sendEmailNotification,
};
