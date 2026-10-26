import { db } from "@/db";
import {
  notificationPreferences,
  type NotificationPreference,
} from "@/db/schema/notifications";
import { eq, and } from "drizzle-orm";
import type {
  NotificationChannelId,
  NotificationPreferenceItem,
  UserPreferencesMap,
} from "../types";

/**
 * Returns all custom preferences set by a user
 */
export async function findPreferencesByUser(
  userId: string
): Promise<NotificationPreference[]> {
  return db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
}

/**
 * Returns a fast lookup map of [channel][type] = enabled boolean
 */
export async function getUserPreferencesMap(
  userId: string
): Promise<UserPreferencesMap> {
  const rows = await findPreferencesByUser(userId);
  const map: UserPreferencesMap = {};

  for (const row of rows) {
    if (!map[row.channel]) {
      map[row.channel] = {};
    }
    map[row.channel][row.type] = row.enabled === 1;
  }

  return map;
}

/**
 * Checks whether a specific channel and category/type is enabled for a user.
 * Defaults to TRUE if no explicit preference row has been stored.
 */
export async function isChannelEnabledForUser(
  userId: string,
  channel: NotificationChannelId,
  type: string
): Promise<boolean> {
  const [row] = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.channel, channel),
        eq(notificationPreferences.type, type)
      )
    )
    .limit(1);

  if (!row) {
    // Enabled by default unless explicitly disabled
    return true;
  }

  return row.enabled === 1;
}

/**
 * Upserts a single preference setting for a user
 */
export async function upsertPreference(
  userId: string,
  channel: NotificationChannelId,
  type: string,
  enabled: boolean
): Promise<void> {
  await db
    .insert(notificationPreferences)
    .values({
      userId,
      channel,
      type,
      enabled: enabled ? 1 : 0,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        notificationPreferences.userId,
        notificationPreferences.channel,
        notificationPreferences.type,
      ],
      set: {
        enabled: enabled ? 1 : 0,
        updatedAt: new Date(),
      },
    });
}

/**
 * Batch updates preferences for a user in a single transaction
 */
export async function bulkUpsertPreferences(
  userId: string,
  items: NotificationPreferenceItem[]
): Promise<void> {
  if (!items.length) return;

  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .insert(notificationPreferences)
        .values({
          userId,
          channel: item.channel,
          type: item.type,
          enabled: item.enabled ? 1 : 0,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            notificationPreferences.userId,
            notificationPreferences.channel,
            notificationPreferences.type,
          ],
          set: {
            enabled: item.enabled ? 1 : 0,
            updatedAt: new Date(),
          },
        });
    }
  });
}
