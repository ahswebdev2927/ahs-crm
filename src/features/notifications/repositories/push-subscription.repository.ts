import { db } from "@/db";
import { pushSubscriptions, type PushSubscriptionRecord } from "@/db/schema/notifications";
import { eq } from "drizzle-orm";
import type { PushSubscriptionData } from "../types";

/**
 * Upserts a Web Push subscription for a user.
 * If the browser endpoint already exists, updates keys and user association.
 */
export async function upsertPushSubscription(
  userId: string,
  data: PushSubscriptionData
): Promise<PushSubscriptionRecord> {
  const id = crypto.randomUUID();

  await db
    .insert(pushSubscriptions)
    .values({
      id,
      userId,
      endpoint: data.endpoint,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
      userAgent: data.userAgent ?? null,
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: data.userAgent ?? null,
      },
    });

  const [row] = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, data.endpoint))
    .limit(1);

  return row;
}

/**
 * Finds all active push subscriptions for a user across all their devices/browsers
 */
export async function findSubscriptionsByUser(
  userId: string
): Promise<PushSubscriptionRecord[]> {
  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

/**
 * Removes a push subscription by its unique endpoint URL.
 * Typically invoked when the push service returns HTTP 410 Gone (expired/unsubscribed).
 */
export async function deleteSubscriptionByEndpoint(
  endpoint: string
): Promise<number> {
  const result = await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));

  return (
    (result as unknown as { rowsAffected?: number; changes?: number }).rowsAffected ??
    (result as unknown as { rowsAffected?: number; changes?: number }).changes ??
    0
  );
}

/**
 * Clears all push subscriptions for a user (e.g. when disabling push channel completely)
 */
export async function deleteSubscriptionsByUser(
  userId: string
): Promise<number> {
  const result = await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  return (
    (result as unknown as { rowsAffected?: number; changes?: number }).rowsAffected ??
    (result as unknown as { rowsAffected?: number; changes?: number }).changes ??
    0
  );
}
