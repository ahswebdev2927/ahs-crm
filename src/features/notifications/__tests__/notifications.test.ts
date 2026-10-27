import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  notificationQuerySchema,
  pushSubscriptionSchema,
  updateNotificationPreferencesSchema,
  sendNotificationSchema,
} from "../schemas/notification.schema";
import { formatRelativeTime } from "../components/notification-card";
import { getAllChannels, getChannel } from "../channels/channel-registry";

describe("Notification Schemas & Contracts", () => {
  test("validates notificationQuerySchema defaults and coercion", () => {
    const parsed = notificationQuerySchema.parse({
      page: "2",
      limit: "10",
      isRead: "true",
      category: "leads",
      search: " Urgent Lead ",
    });

    assert.equal(parsed.page, 2);
    assert.equal(parsed.limit, 10);
    assert.equal(parsed.isRead, true);
    assert.equal(parsed.category, "leads");
    assert.equal(parsed.search, "Urgent Lead");
  });

  test("validates pushSubscriptionSchema with valid keys", () => {
    const valid = {
      endpoint: "https://fcm.googleapis.com/fcm/send/sample-token",
      keys: {
        p256dh: "BMbZ7YXCgXBpaX1j32L3Qn4h1mm80eJoHXtAUPjb8fuRPjcalpaj8ucMAkhNBJFTn_EjqbUT74Aq_1gkWoM8TSo",
        auth: "HJdKGsgMiiHdkx8m_d6AJI",
      },
      userAgent: "Mozilla/5.0 Test Browser",
    };

    const parsed = pushSubscriptionSchema.parse(valid);
    assert.equal(parsed.endpoint, valid.endpoint);
    assert.equal(parsed.keys.p256dh, valid.keys.p256dh);
  });

  test("rejects invalid push subscription endpoints", () => {
    assert.throws(() => {
      pushSubscriptionSchema.parse({
        endpoint: "not-a-url",
        keys: { p256dh: "key", auth: "auth" },
      });
    });
  });

  test("validates updateNotificationPreferencesSchema matrix", () => {
    const payload = {
      preferences: [
        { channel: "in_app" as const, type: "leads", enabled: true },
        { channel: "push" as const, type: "leads", enabled: false },
        { channel: "sound" as const, type: "tasks", enabled: true },
      ],
    };

    const parsed = updateNotificationPreferencesSchema.parse(payload);
    assert.equal(parsed.preferences.length, 3);
    assert.equal(parsed.preferences[1].enabled, false);
  });

  test("validates sendNotificationSchema", () => {
    const payload = {
      recipientId: "user-uuid-123",
      title: "New Lead Assigned",
      message: "You have been assigned Acme Corp.",
      category: "leads" as const,
      type: "lead:assigned",
      actionUrl: "/leads/123",
      referenceId: "123",
    };

    const parsed = sendNotificationSchema.parse(payload);
    assert.equal(parsed.recipientId, "user-uuid-123");
    assert.equal(parsed.category, "leads");
  });
});

describe("Relative Time Formatter", () => {
  test("formats timestamps accurately", () => {
    const now = Date.now();
    assert.equal(formatRelativeTime(new Date(now - 10 * 1000)), "Just now");
    assert.equal(formatRelativeTime(new Date(now - 5 * 60 * 1000)), "5m ago");
    assert.equal(formatRelativeTime(new Date(now - 3 * 60 * 60 * 1000)), "3h ago");
    assert.equal(formatRelativeTime(new Date(now - 25 * 60 * 60 * 1000)), "Yesterday");
  });
});

describe("Channel Registry & Adapters", () => {
  test("registers and retrieves active and future channels without classes", () => {
    const channels = getAllChannels();
    assert.ok(channels.length >= 4, "Should have at least 4 channels registered");

    const inApp = getChannel("in_app");
    assert.ok(inApp, "in_app channel should be present");
    assert.equal(inApp?.id, "in_app");
    assert.equal(typeof inApp?.send, "function");

    const push = getChannel("push");
    assert.ok(push, "push channel should be present");
    assert.equal(push?.id, "push");
    assert.equal(typeof push?.send, "function");

    const email = getChannel("email");
    assert.ok(email, "email stub should be present");

    const whatsapp = getChannel("whatsapp");
    assert.ok(whatsapp, "whatsapp stub should be present");
  });
});
