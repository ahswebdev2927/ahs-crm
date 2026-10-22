import { z } from "zod";

export const createTaskNoteSchema = z.object({
  content: z
    .string({ required_error: "Note content is required" })
    .trim()
    .min(1, "Note content cannot be empty")
    .max(3000, "Note content must not exceed 3000 characters"),
});

export type CreateTaskNoteInput = z.infer<typeof createTaskNoteSchema>;

export const updateTaskNoteSchema = z.object({
  content: z
    .string({ required_error: "Note content is required" })
    .trim()
    .min(1, "Note content cannot be empty")
    .max(3000, "Note content must not exceed 3000 characters"),
});

export type UpdateTaskNoteInput = z.infer<typeof updateTaskNoteSchema>;
