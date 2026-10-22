import { z } from "zod";

export const manualActivityTypeEnum = z.enum([
  "note",
  "call",
  "email",
  "meeting",
  "whatsapp",
]);

export const activityCategoryFilterEnum = z.enum([
  "all",
  "communication",
  "lifecycle",
  "commercial",
]);

export const createManualActivitySchema = z
  .object({
    leadId: z.string().trim().optional().nullable(),
    customerId: z.string().trim().optional().nullable(),
    type: manualActivityTypeEnum,
    subject: z.string().trim().min(1, "Subject is required").max(200),
    description: z.string().trim().min(1, "Description or note content is required").max(5000),
    outcome: z.string().trim().max(50).optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .refine((data) => Boolean(data.leadId || data.customerId), {
    message: "Either leadId or customerId must be provided",
    path: ["leadId"],
  });

export const updateManualActivitySchema = z.object({
  subject: z.string().trim().min(1, "Subject cannot be empty").max(200).optional(),
  description: z.string().trim().min(1, "Description cannot be empty").max(5000).optional(),
  outcome: z.string().trim().max(50).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const activityQuerySchema = z.object({
  leadId: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  category: activityCategoryFilterEnum.default("all"),
  type: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateManualActivityInput = z.infer<typeof createManualActivitySchema>;
export type UpdateManualActivityInput = z.infer<typeof updateManualActivitySchema>;
export type ActivityQueryInput = z.infer<typeof activityQuerySchema>;
