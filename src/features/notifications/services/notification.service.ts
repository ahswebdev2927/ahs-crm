import { logger } from "@/lib/logger";
import { getAllChannels } from "../channels/channel-registry";
import {
  findNotificationsByUser,
  countUnreadByUser,
  markNotificationAsRead as repoMarkAsRead,
  markAllNotificationsAsRead as repoMarkAllAsRead,
  deleteReadNotifications as repoDeleteRead,
  purgeOldReadNotifications as repoPurgeOld,
} from "../repositories/notification.repository";
import {
  isChannelEnabledForUser,
  getUserPreferencesMap,
  bulkUpsertPreferences,
} from "../repositories/notification-preference.repository";
import type {
  NotificationPayload,
  NotificationListFilter,
  PaginatedNotifications,
  NotificationPreferenceItem,
  UserPreferencesMap,
} from "../types";

/**
 * Dispatches a notification across all enabled channels for a user.
 *
 * Notification dispatch runs asynchronously and fail-safely.
 * A delivery error in any channel (e.g. expired Web Push endpoint or external network issue)
 * MUST NEVER cause the calling business transaction to fail or roll back.
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<void> {
  // Execute asynchronously in background to ensure zero blocking on calling flow
  Promise.resolve().then(async () => {
    try {
      const channels = getAllChannels();

      const deliveryPromises = channels.map(async (channel) => {
        // Check if user has enabled this channel for this category
        const isEnabled = await isChannelEnabledForUser(
          payload.recipientId,
          channel.id,
          payload.category
        );

        if (!isEnabled) {
          logger.debug(
            { channel: channel.id, category: payload.category, recipientId: payload.recipientId },
            "Notification suppressed by user preferences"
          );
          return null;
        }

        return channel.send(payload);
      });

      const settled = await Promise.allSettled(deliveryPromises);

      settled.forEach((res, idx) => {
        const channelName = channels[idx].id;
        if (res.status === "rejected") {
          logger.warn(
            { channel: channelName, reason: res.reason, recipientId: payload.recipientId },
            "Notification channel delivery rejected"
          );
        } else if (res.value && !res.value.success) {
          logger.warn(
            { channel: channelName, error: res.value.error, recipientId: payload.recipientId },
            "Notification channel reported unsuccessful delivery"
          );
        }
      });
    } catch (err) {
      logger.error(
        { err, recipientId: payload.recipientId, type: payload.type },
        "Unexpected error in background notification orchestrator"
      );
    }
  });
}

/**
 * Retrieves paginated notifications with computed meta and unread counts
 */
export async function getUserNotifications(
  userId: string,
  filter: NotificationListFilter = {}
): Promise<PaginatedNotifications> {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 20));

  const [{ items, total }, unreadCount] = await Promise.all([
    findNotificationsByUser(userId, filter),
    countUnreadByUser(userId),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    unreadCount,
  };
}

/**
 * Returns fast scalar count of unread notifications for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return countUnreadByUser(userId);
}

/**
 * Marks a single notification as read
 */
export async function markNotificationAsRead(
  id: string,
  userId: string
): Promise<boolean> {
  return repoMarkAsRead(id, userId);
}

/**
 * Marks all unread notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  return repoMarkAllAsRead(userId);
}

/**
 * Deletes all read notifications for a user (manual cleanup)
 */
export async function clearReadNotifications(userId: string): Promise<number> {
  return repoDeleteRead(userId);
}

/**
 * Purges read notifications older than a retention threshold (defaults to 60 days)
 */
export async function purgeOldNotifications(olderThanDays = 60): Promise<number> {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const deletedCount = await repoPurgeOld(cutoffDate);
  logger.info(
    { olderThanDays, cutoffDate, deletedCount },
    "Purged old read notifications from system"
  );
  return deletedCount;
}

/**
 * Retrieves user preferences mapping
 */
export async function getUserPreferences(userId: string): Promise<UserPreferencesMap> {
  return getUserPreferencesMap(userId);
}

/**
 * Updates user notification preferences in bulk
 */
export async function updateUserPreferences(
  userId: string,
  items: NotificationPreferenceItem[]
): Promise<void> {
  await bulkUpsertPreferences(userId, items);
  logger.info({ userId, itemsCount: items.length }, "Updated user notification preferences");
}
