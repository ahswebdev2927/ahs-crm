/**
 * Domain types for the Notification Center module
 */

export type NotificationCategory =
  | "leads"
  | "appointments"
  | "tasks"
  | "financials"
  | "customers"
  | "system";

export type NotificationChannelId =
  | "in_app"
  | "push"
  | "sound"
  | "email"
  | "whatsapp";

export interface NotificationItem {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: string;
  category: NotificationCategory;
  referenceId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationPayload {
  recipientId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  type: string;
  actionUrl?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationListFilter {
  isRead?: boolean;
  category?: NotificationCategory;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedNotifications {
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export interface NotificationPreferenceItem {
  channel: NotificationChannelId;
  type: string; // Category or specific event identifier
  enabled: boolean;
}

export interface UserPreferencesMap {
  [channel: string]: {
    [type: string]: boolean;
  };
}

export interface ChannelSendResult {
  channel: NotificationChannelId;
  success: boolean;
  error?: string;
}
