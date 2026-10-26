// Service Worker for AHS CRM Web Push & Background Notifications
// Lifecycle: Immediate activation and client control

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push notifications from server
self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (err) {
    payload = {
      title: "AHS CRM Alert",
      message: event.data.text() || "You have a new update in CRM.",
      actionUrl: "/notifications",
    };
  }

  const title = payload.title || "AHS CRM Notification";
  const message = payload.message || payload.body || "New notification received.";
  const actionUrl = payload.actionUrl || payload.url || "/notifications";
  const tag = payload.tag || `ahs-notif-${payload.id || Date.now()}`;

  const notificationOptions = {
    body: message,
    icon: payload.icon || "/favicon.ico",
    badge: payload.badge || "/favicon.ico",
    data: {
      url: actionUrl,
      id: payload.id,
      category: payload.category || "system",
      type: payload.type,
      timestamp: Date.now(),
    },
    tag: tag,
    renotify: true,
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    Promise.all([
      // 1. Display native OS/Browser notification (works even when tab/browser is closed)
      self.registration.showNotification(title, notificationOptions),

      // 2. Broadcast to all active CRM browser tabs (for instant badge & sound sync)
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "PUSH_NOTIFICATION_RECEIVED",
            payload: {
              id: payload.id,
              title,
              message,
              actionUrl,
              category: payload.category || "system",
              type: payload.type,
              timestamp: Date.now(),
            },
          });
        });
      }),
    ])
  );
});

// Handle user clicking on a native notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/notifications";
  const fullTargetUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a CRM tab is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url && client.url.startsWith(self.location.origin) && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(fullTargetUrl);
          }
          return client.focus();
        }
      }

      // If no tab is open, open a new window/tab to the notification action URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullTargetUrl);
      }
    })
  );
});
