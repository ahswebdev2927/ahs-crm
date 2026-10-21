import { z } from "zod";

export const taskPriorityEnum = z.enum(["low", "medium", "high", "critical"]);
export type TaskPriority = z.infer<typeof taskPriorityEnum>;

export const taskStatusEnum = z.enum([
  "pending",
  "in_progress",
  "completed",
  "deferred",
  "cancelled",
]);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

/**
 * Preprocessor helper for dueDate timestamps.
 * Accepts numeric ms, ISO date strings, or Date instances and converts to integer timestamp ms.
 */
const dueDatePreprocessor = z.preprocess((val) => {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const num = Number(val);
    if (!isNaN(num) && num > 0) return num;
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  if (val instanceof Date) return val.getTime();
  return val;
}, z.number().int("Due date must be a valid timestamp").nullable().optional());

export const createTaskSchema = z.object({
  title: z
    .string({ required_error: "Task title is required" })
    .trim()
    .min(1, "Task title is required")
    .max(255, "Task title must not exceed 255 characters"),
  description: z
    .string()
    .max(2000, "Description must not exceed 2000 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" || val === undefined ? null : val))
    .default(null),
  assignedToId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" || val === "unassigned" || val === undefined ? null : val))
    .default(null),
  dueDate: dueDatePreprocessor.default(null),
  priority: taskPriorityEnum.default("medium"),
  status: taskStatusEnum.default("pending"),
  leadId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" || val === undefined ? null : val))
    .default(null),
  customerId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" || val === undefined ? null : val))
    .default(null),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Task title is required")
    .max(255, "Task title must not exceed 255 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, "Description must not exceed 2000 characters")
    .nullable()
    .optional(),
  assignedToId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" || val === "unassigned" ? null : val)),
  dueDate: dueDatePreprocessor,
  priority: taskPriorityEnum.optional(),
  status: taskStatusEnum.optional(),
  leadId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
  customerId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
  completedAt: z.number().int().nullable().optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const updateTaskStatusSchema = z.object({
  status: taskStatusEnum,
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export const taskQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.union([taskStatusEnum, z.literal("all")]).optional(),
  priority: z.union([taskPriorityEnum, z.literal("all")]).optional(),
  assignedToId: z.string().optional(),
  leadId: z.string().optional(),
  customerId: z.string().optional(),
  overdue: z
    .preprocess((val) => val === "true" || val === true || val === "1" || val === 1, z.boolean())
    .optional(),
  sortBy: z
    .enum(["dueDate", "priority", "createdAt", "status", "title"])
    .default("dueDate"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
