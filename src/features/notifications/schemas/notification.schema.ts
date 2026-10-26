import { z } from "zod";

export const notificationCategoryEnum = z.enum([
  "leads",
  "appointments",
  "tasks",
  "financials",
  "customers",
  "system",
]);

export const notificationChannelEnum = z.enum([
  "in_app",
  "push",
  "sound",
  "email",
  "whatsapp",
]);

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      return val === true || val === "true";
    }),
  category: notificationCategoryEnum.optional(),
  search: z.string().trim().max(100).optional(),
});

export const markNotificationReadSchema = z.object({
  id: z.string().min(1, "Notification ID is required"),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url("Valid push endpoint URL is required"),
  keys: z.object({
    p256dh: z.string().min(1, "p256dh public key is required"),
    auth: z.string().min(1, "auth secret is required"),
  }),
  userAgent: z.string().optional(),
});

export const unsubscribePushSchema = z.object({
  endpoint: z.string().url("Valid push endpoint URL is required"),
});

export const preferenceItemSchema = z.object({
  channel: notificationChannelEnum,
  type: z.string().min(1, "Preference type/category is required"),
  enabled: z.boolean(),
});

export const updateNotificationPreferencesSchema = z.object({
  preferences: z.array(preferenceItemSchema).min(1, "At least one preference must be provided"),
});

export const sendNotificationSchema = z.object({
  recipientId: z.string().min(1, "Recipient ID is required"),
  title: z.string().trim().min(1, "Title is required").max(255),
  message: z.string().trim().min(1, "Message is required").max(2000),
  category: notificationCategoryEnum.default("system"),
  type: z.string().trim().min(1, "Notification type is required"),
  actionUrl: z.string().trim().optional(),
  referenceId: z.string().trim().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type UnsubscribePushInput = z.infer<typeof unsubscribePushSchema>;
export type UpdatePreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
