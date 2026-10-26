import type {
  NotificationPayload,
  NotificationChannelId,
  ChannelSendResult,
} from "../types";

/**
 * Standard interface for all notification channel adapters.
 * Adheres to the Strategy / Provider pattern so adding new channels
 * (e.g. Email, WhatsApp) requires zero changes to core business services.
 */
export interface NotificationChannel {
  readonly id: NotificationChannelId;
  send(payload: NotificationPayload): Promise<ChannelSendResult>;
}
