import { z } from "zod";

export const followUpTypeEnum = z.enum([
  "call",
  "meeting",
  "whatsapp",
  "email",
  "site_visit",
  "other",
]);

export const followUpStatusEnum = z.enum([
  "scheduled",
  "completed",
  "rescheduled",
  "cancelled",
  "missed",
]);

export type FollowUpType = z.infer<typeof followUpTypeEnum>;
export type FollowUpStatus = z.infer<typeof followUpStatusEnum>;

export const createFollowUpSchema = z
  .object({
    leadId: z.string().optional().nullable(),
    customerId: z.string().optional().nullable(),
    scheduledAt: z
      .union([z.string(), z.number(), z.date()])
      .transform((val) => new Date(val)),
    type: followUpTypeEnum.default("call"),
    notes: z.string().optional().nullable(),
    assignedToId: z.string().min(1, "Assigned representative is required"),
  })
  .refine((data) => Boolean(data.leadId || data.customerId), {
    message: "At least one of leadId or customerId must be provided",
    path: ["leadId"],
  });

export const updateFollowUpSchema = z.object({
  scheduledAt: z
    .union([z.string(), z.number(), z.date()])
    .transform((val) => new Date(val))
    .optional(),
  type: followUpTypeEnum.optional(),
  notes: z.string().optional().nullable(),
  assignedToId: z.string().optional(),
  status: followUpStatusEnum.optional(),
  outcome: z.string().optional().nullable(),
});

export const completeFollowUpSchema = z.object({
  outcome: z.string().min(1, "Outcome notes are required when completing a follow-up"),
  completedAt: z
    .union([z.string(), z.number(), z.date()])
    .transform((val) => new Date(val))
    .optional(),
  nextFollowUp: z
    .object({
      type: followUpTypeEnum.default("call"),
      scheduledAt: z
        .union([z.string(), z.number(), z.date()])
        .transform((val) => new Date(val)),
      notes: z.string().optional().nullable(),
      assignedToId: z.string().optional(),
    })
    .optional(),
});

export const cancelFollowUpSchema = z.object({
  reason: z.string().optional(),
});

export const followUpQuerySchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  timeframe: z
    .enum(["all", "overdue", "today", "upcoming", "completed"])
    .optional()
    .default("all"),
  assignedToId: z.string().optional(),
  leadId: z.string().optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(10),
  sortBy: z.enum(["scheduledAt", "createdAt", "status"]).optional().default("scheduledAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
export type CompleteFollowUpInput = z.infer<typeof completeFollowUpSchema>;
export type CancelFollowUpInput = z.infer<typeof cancelFollowUpSchema>;
export type FollowUpQueryInput = z.infer<typeof followUpQuerySchema>;
