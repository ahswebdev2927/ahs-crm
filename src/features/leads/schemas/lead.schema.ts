import { z } from "zod";

export const leadPriorityEnum = z.enum(["low", "medium", "high", "critical"]);
export const leadStatusEnum = z.enum(["active", "archived", "deleted"]);

export const createLeadSchema = z.object({
  name: z.string().trim().min(2, "Lead name must be at least 2 characters."),
  company: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.union([z.string().trim().email("Invalid email address"), z.literal("")]).nullable().optional(),
  source: z.string().trim().nullable().optional(),
  requirements: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  priority: leadPriorityEnum.default("medium"),
  stageId: z.number().int().positive("Stage is required."),
  ownerId: z.string().trim().nullable().optional(),
});

export const updateLeadSchema = z.object({
  name: z.string().trim().min(2, "Lead name must be at least 2 characters.").optional(),
  company: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.union([z.string().trim().email("Invalid email address"), z.literal("")]).nullable().optional(),
  source: z.string().trim().nullable().optional(),
  requirements: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  priority: leadPriorityEnum.optional(),
  stageId: z.number().int().positive().optional(),
  ownerId: z.string().trim().nullable().optional(),
  status: leadStatusEnum.optional(),
});

export const assignLeadSchema = z.object({
  ownerId: z.string().trim().min(1, "Assigned owner is required."),
  reason: z.string().trim().nullable().optional(),
});

export const updateLeadStageSchema = z.object({
  toStageId: z.number().int().positive("Target stage is required."),
  reason: z.string().trim().nullable().optional(),
});

export const createLeadStageSchema = z.object({
  name: z.string().trim().min(2, "Stage name must be at least 2 characters."),
  code: z
    .string()
    .trim()
    .min(2, "Stage code must be at least 2 characters.")
    .regex(/^[a-z0-9_]+$/, "Code must be lowercase alphanumeric with underscores."),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code (e.g. #3b82f6).")
    .default("#6b7280"),
  order: z.number().int().nonnegative(),
  description: z.string().trim().nullable().optional(),
});

export const reorderLeadStagesSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    order: z.number().int().nonnegative(),
  })
).min(1, "At least one stage order must be provided.");

export const leadQuerySchema = z.object({
  search: z.string().optional(),
  priority: leadPriorityEnum.optional(),
  source: z.string().optional(),
  stageId: z.coerce.number().int().positive().optional(),
  status: leadStatusEnum.default("active"),
  ownerId: z.string().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "company", "priority"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const moveLeadStageSchema = z.object({
  leadId: z.string().trim().min(1, "Lead ID is required."),
  fromStageId: z.number().int().positive("Source stage is required."),
  toStageId: z.number().int().positive("Destination stage is required."),
  newPosition: z.number().int().nonnegative("New position must be non-negative.").default(0),
  reason: z.string().trim().nullable().optional(),
});

export const reorderStageLeadsSchema = z.object({
  stageId: z.number().int().positive("Stage ID is required."),
  leadOrders: z.array(
    z.object({
      leadId: z.string().trim().min(1, "Lead ID is required."),
      position: z.number().int().nonnegative("Position must be non-negative."),
    })
  ).min(1, "At least one lead order must be provided."),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type AssignLeadInput = z.infer<typeof assignLeadSchema>;
export type UpdateLeadStageInput = z.infer<typeof updateLeadStageSchema>;
export type CreateLeadStageInput = z.infer<typeof createLeadStageSchema>;
export type ReorderLeadStagesInput = z.infer<typeof reorderLeadStagesSchema>;
export type LeadQueryInput = z.infer<typeof leadQuerySchema>;
export type MoveLeadStageInput = z.infer<typeof moveLeadStageSchema>;
export type ReorderStageLeadsInput = z.infer<typeof reorderStageLeadsSchema>;
