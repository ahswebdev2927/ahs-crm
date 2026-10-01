import { z } from "zod";

export const fieldVisitStatusEnum = z.enum(["scheduled", "completed", "cancelled"]);
export type FieldVisitStatus = z.infer<typeof fieldVisitStatusEnum>;

export const nextActionEnum = z.enum([
  "follow_up",
  "proposal",
  "second_visit",
  "negotiation",
  "won",
  "lost",
]);
export type NextActionType = z.infer<typeof nextActionEnum>;

export const createFieldVisitSchema = z
  .object({
    leadId: z.string().nullable().optional(),
    customerId: z.string().nullable().optional(),
    appointmentId: z.string().nullable().optional(),
    visitDate: z.number().int("Visit date must be a timestamp"),
    purpose: z.string().min(1, "Purpose is required").max(500, "Purpose is too long"),
    assignedToId: z.string().min(1, "Assigned representative is required"),
    expenses: z.number().min(0, "Expenses cannot be negative").optional().default(0),
    summary: z.string().max(2000).nullable().optional(),
    requirements: z.string().max(2000).nullable().optional(),
    outcome: z.string().max(1000).nullable().optional(),
    feedback: z.string().max(2000).nullable().optional(),
  })
  .refine((data) => data.leadId || data.customerId, {
    message: "Either a Lead or a Customer must be selected",
    path: ["leadId"],
  });

export type CreateFieldVisitInput = z.infer<typeof createFieldVisitSchema>;

export const completeFieldVisitSchema = z.object({
  summary: z.string().max(2000).nullable().optional(),
  requirements: z.string().max(2000).nullable().optional(),
  outcome: z.string().max(1000).nullable().optional(),
  feedback: z.string().max(2000).nullable().optional(),
  expenses: z.number().min(0, "Expenses cannot be negative").optional(),
  nextAction: nextActionEnum.nullable().optional(),
  nextActionDate: z.number().int("Next action date must be a timestamp").nullable().optional(),
});

export type CompleteFieldVisitInput = z.infer<typeof completeFieldVisitSchema>;

export const updateFieldVisitSchema = z.object({
  visitDate: z.number().int().optional(),
  purpose: z.string().min(1).max(500).optional(),
  assignedToId: z.string().min(1).optional(),
  summary: z.string().max(2000).nullable().optional(),
  requirements: z.string().max(2000).nullable().optional(),
  outcome: z.string().max(1000).nullable().optional(),
  feedback: z.string().max(2000).nullable().optional(),
  expenses: z.number().min(0).optional(),
  nextAction: nextActionEnum.nullable().optional(),
  nextActionDate: z.number().int().nullable().optional(),
  status: fieldVisitStatusEnum.optional(),
});

export type UpdateFieldVisitInput = z.infer<typeof updateFieldVisitSchema>;

export const fieldVisitQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.union([fieldVisitStatusEnum, z.literal("all")]).optional(),
  assignedToId: z.string().optional(),
  leadId: z.string().optional(),
  customerId: z.string().optional(),
  appointmentId: z.string().optional(),
  startDate: z.coerce.number().optional(),
  endDate: z.coerce.number().optional(),
  search: z.string().optional(),
});

export type FieldVisitQueryInput = z.infer<typeof fieldVisitQuerySchema>;
