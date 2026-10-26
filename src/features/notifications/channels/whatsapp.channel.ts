import type { NotificationChannel } from "./channel.interface";
import type { NotificationPayload, ChannelSendResult } from "../types";
import { logger } from "@/lib/logger";

/**
 * Pure function to dispatch WhatsApp notifications (Extension Slot).
 * Ready to be connected to Meta Cloud API or Twilio in a future phase
 * without requiring any changes to CRM business logic.
 */
export async function sendWhatsAppNotification(
  payload: NotificationPayload
): Promise<ChannelSendResult> {
  logger.debug(
    { recipientId: payload.recipientId, title: payload.title },
    "WhatsAppChannel: Notification skipped (channel not active in current phase)"
  );

  return {
    channel: "whatsapp",
    success: true,
  };
}

export const whatsAppChannel: NotificationChannel = {
  id: "whatsapp",
  send: sendWhatsAppNotification,
};
