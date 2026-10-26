import webpush from "web-push";
import { logger } from "@/lib/logger";
import {
  findSubscriptionsByUser,
  deleteSubscriptionByEndpoint,
} from "../repositories/push-subscription.repository";
import type { PushSubscriptionRecord } from "@/db/schema/notifications";
import type {
  NotificationPayload,
  ChannelSendResult,
} from "../types";

let vapidConfigured = false;

function ensureVapidDetails(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@ahscrm.internal";

  if (!publicKey || !privateKey) {
    logger.warn("Web Push VAPID keys are missing. Web push dispatch will be skipped.");
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to configure web-push VAPID details");
    return false;
  }
}

/**
 * Sends a Web Push notification to a specific browser push subscription.
 * If the push service returns HTTP 410 Gone or 404, the dead subscription
 * is automatically pruned from the database.
 */
export async function sendWebPushToSubscription(
  subscription: PushSubscriptionRecord,
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  if (!ensureVapidDetails()) {
    return { success: false, error: "VAPID not configured" };
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  const notificationBody = JSON.stringify({
    id: crypto.randomUUID(),
    title: payload.title,
    message: payload.message,
    category: payload.category,
    type: payload.type,
    actionUrl: payload.actionUrl || "/notifications",
    referenceId: payload.referenceId,
    tag: `crm-${payload.category}-${Date.now()}`,
    timestamp: Date.now(),
  });

  try {
    await webpush.sendNotification(pushSubscription, notificationBody, {
      TTL: 60 * 60 * 24, // 24 hours retention on push service
    });
    return { success: true };
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    const statusCode = error.statusCode;

    // HTTP 410 Gone or 404 Not Found indicates client revoked permissions or browser unsubscribed
    if (statusCode === 410 || statusCode === 404) {
      logger.info(
        { endpoint: subscription.endpoint, statusCode },
        "Pruning expired/unregistered Web Push subscription from database"
      );
      try {
        await deleteSubscriptionByEndpoint(subscription.endpoint);
      } catch (deleteErr) {
        logger.error({ deleteErr }, "Failed to prune expired subscription");
      }
    } else {
      logger.warn(
        { endpoint: subscription.endpoint, statusCode, message: error.message },
        "Web push delivery failed"
      );
    }

    return {
      success: false,
      error: error.message || "Failed to deliver web push notification",
    };
  }
}

/**
 * Dispatches a Web Push notification to all active devices registered by a recipient.
 */
export async function sendWebPushToUser(
  userId: string,
  payload: NotificationPayload
): Promise<ChannelSendResult> {
  try {
    const subscriptions = await findSubscriptionsByUser(userId);

    if (!subscriptions.length) {
      return { channel: "push", success: true };
    }

    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendWebPushToSubscription(sub, payload))
    );

    const hasSuccess = results.some(
      (r) => r.status === "fulfilled" && r.value.success
    );

    return {
      channel: "push",
      success: hasSuccess || subscriptions.length === 0,
    };
  } catch (err: unknown) {
    const error = err as Error;
    logger.error({ err, userId }, "Error during web push dispatch to user");
    return {
      channel: "push",
      success: false,
      error: error.message,
    };
  }
}
