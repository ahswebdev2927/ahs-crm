export * from "./types";
export * from "./schemas/notification.schema";
export * from "./services/notification.service";
export * from "./services/web-push.service";
export * from "./channels/channel.interface";
export * from "./channels/channel-registry";
export * from "./actions";
export * from "./hooks";
export * from "./components";

// Export repository functions without name collisions
export {
  findNotificationsByUser,
  countUnreadByUser,
  findNotificationById,
  createNotificationRecord,
  deleteReadNotifications,
  purgeOldReadNotifications,
} from "./repositories/notification.repository";

export {
  upsertPushSubscription,
  findSubscriptionsByUser,
  deleteSubscriptionByEndpoint,
  deleteSubscriptionsByUser,
} from "./repositories/push-subscription.repository";

export {
  findPreferencesByUser,
  getUserPreferencesMap,
  isChannelEnabledForUser,
  upsertPreference,
  bulkUpsertPreferences,
} from "./repositories/notification-preference.repository";
