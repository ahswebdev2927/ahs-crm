import { z } from "zod";

export const createTaskTodoSchema = z.object({
  title: z
    .string({ required_error: "Todo item title is required" })
    .trim()
    .min(1, "Todo item title is required")
    .max(255, "Todo title must not exceed 255 characters"),
  position: z.number().int().min(0).optional().default(0),
});

export type CreateTaskTodoInput = z.infer<typeof createTaskTodoSchema>;

export const updateTaskTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Todo item title cannot be empty")
    .max(255, "Todo title must not exceed 255 characters")
    .optional(),
  isCompleted: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export type UpdateTaskTodoInput = z.infer<typeof updateTaskTodoSchema>;

export const reorderTaskTodosSchema = z.object({
  todoIds: z.array(z.string().min(1)).min(1, "At least one todo ID is required"),
});

export type ReorderTaskTodosInput = z.infer<typeof reorderTaskTodosSchema>;
