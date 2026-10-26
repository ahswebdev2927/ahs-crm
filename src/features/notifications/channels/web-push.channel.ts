import type { NotificationChannel } from "./channel.interface";
import type { NotificationPayload, ChannelSendResult } from "../types";
import { sendWebPushToUser } from "../services/web-push.service";

/**
 * Pure function to dispatch Web Push notifications.
 * Delivers push notifications to the browser Service Worker,
 * allowing alerts even when the website is closed.
 */
export async function sendWebPushNotification(
  payload: NotificationPayload
): Promise<ChannelSendResult> {
  return sendWebPushToUser(payload.recipientId, payload);
}

export const webPushChannel: NotificationChannel = {
  id: "push",
  send: sendWebPushNotification,
};
