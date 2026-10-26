import type { NotificationChannel } from "./channel.interface";
import type { NotificationChannelId } from "../types";
import { inAppChannel } from "./in-app.channel";
import { webPushChannel } from "./web-push.channel";
import { emailChannel } from "./email.channel";
import { whatsAppChannel } from "./whatsapp.channel";

/**
 * Functional registry holding all available notification channel adapters.
 * Enables runtime dispatch and easy addition of new channels.
 */
const channels = new Map<NotificationChannelId, NotificationChannel>([
  ["in_app", inAppChannel],
  ["push", webPushChannel],
  ["email", emailChannel],
  ["whatsapp", whatsAppChannel],
]);

export function registerChannel(channel: NotificationChannel): void {
  channels.set(channel.id, channel);
}

export function getChannel(id: NotificationChannelId): NotificationChannel | undefined {
  return channels.get(id);
}

export function getAllChannels(): NotificationChannel[] {
  return Array.from(channels.values());
}
