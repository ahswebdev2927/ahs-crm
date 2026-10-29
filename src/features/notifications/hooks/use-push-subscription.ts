"use client";

import * as React from "react";

/**
 * Utility: Converts a URL-safe Base64 string to a Uint8Array
 * backed by an ArrayBuffer for pushManager.subscribe() applicationServerKey
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const clean = base64String.trim().replace(/^["']|["']$/g, "");
  const padding = "=".repeat((4 - (clean.length % 4)) % 4);
  const base64 = (clean + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface UsePushSubscriptionReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;
}

/**
 * Functional React hook managing Service Worker push subscription registration,
 * permission status, and backend synchronization.
 */
export function usePushSubscription(): UsePushSubscriptionReturn {
  const [isSupported, setIsSupported] = React.useState<boolean>(false);
  const [permission, setPermission] = React.useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission);

    // Register / check existing Service Worker registration
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        return registration.pushManager.getSubscription();
      })
      .then((subscription) => {
        setIsSubscribed(subscription !== null);
      })
      .catch((err) => {
        console.warn("Service worker registration check error:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const subscribeToPush = React.useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Push notifications are not supported in this browser.");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Request browser notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setError(
          perm === "denied"
            ? "Notification permission was blocked in browser settings."
            : "Notification permission was not granted."
        );
        setIsLoading(false);
        return false;
      }

      // 2. Ensure Service Worker registration is ready
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
      }
      await navigator.serviceWorker.ready;

      // 3. Obtain VAPID public key (prefer env, fallback to server endpoint)
      let vapidPublicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim().replace(/^["']|["']$/g, "");
      if (!vapidPublicKey) {
        try {
          const res = await fetch("/api/notifications/push/vapid-public-key");
          if (res.ok) {
            const json = await res.json();
            vapidPublicKey = (json?.data?.publicKey || "").trim();
          }
        } catch {
          // Fall through
        }
      }

      if (!vapidPublicKey) {
        throw new Error("VAPID public key is not configured.");
      }

      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

      // 4. Create browser PushSubscription
      // Unsubscribe any stale or conflicting existing subscription first to prevent push service error
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        try {
          await existingSub.unsubscribe();
        } catch {
          // Continue to subscribe attempt
        }
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      const subJson = subscription.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error("Incomplete push subscription credentials received.");
      }

      // 5. Send subscription credentials to backend API
      const res = await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to register push subscription with server.");
      }

      setIsSubscribed(true);
      return true;
    } catch (err: unknown) {
      let friendlyMessage = "Failed to enable background push notifications.";

      const isBrave =
        typeof navigator !== "undefined" &&
        (Boolean((navigator as any).brave) ||
          navigator.userAgent.includes("Brave") ||
          (Boolean((navigator as any).brave?.isBrave) && (navigator as any).brave.isBrave()));

      const isAbortError =
        err instanceof Error &&
        (err.name === "AbortError" ||
          err.message.toLowerCase().includes("push service error") ||
          err.message.toLowerCase().includes("registration failed"));

      if (isAbortError) {
        if (isBrave) {
          friendlyMessage =
            "Push service is disabled by Brave. Go to brave://settings/privacy, enable 'Use Google services for push messaging', and reload.";
        } else {
          friendlyMessage =
            "Browser push service is currently unreachable (network, firewall/VPN, or Incognito mode). In-app alerts remain active.";
        }
      } else if (err instanceof Error) {
        friendlyMessage = err.message;
      }

      setError(friendlyMessage);
      console.warn("Push subscription warning:", friendlyMessage, err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribeFromPush = React.useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        // Notify server to delete subscription
        await fetch("/api/notifications/push/unsubscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setIsSubscribed(false);
      return true;
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : "Failed to unsubscribe";
      setError(errMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribeToPush,
    unsubscribeFromPush,
  };
}
