import { AppError } from "@/lib/errors/AppError";
import { logSystemEvent } from "@/features/activities/services/activity.service";
import { checkTaskAccess } from "@/features/auth/services/authorization.service";
import { findTaskById } from "../repositories/task.repository";
import {
  findNotesByTaskId,
  findNoteById,
  createNoteRecord,
  updateNoteRecord,
  deleteNoteRecord,
} from "../repositories/task-note.repository";
import {
  createTaskNoteSchema,
  updateTaskNoteSchema,
  type CreateTaskNoteInput,
  type UpdateTaskNoteInput,
} from "../schemas/task-note.schema";
import type { TaskNoteItem } from "../types/task.types";

/**
 * Retrieve all notes for a given task
 */
export async function getTaskNotes(taskId: string): Promise<TaskNoteItem[]> {
  await checkTaskAccess(taskId, "view");
  return findNotesByTaskId(taskId);
}

/**
 * Add a new note to a task
 */
export async function createTaskNote(
  taskId: string,
  input: CreateTaskNoteInput
): Promise<TaskNoteItem> {
  const user = await checkTaskAccess(taskId, "edit");
  const validated = createTaskNoteSchema.parse(input);

  const note = await createNoteRecord({
    taskId,
    userId: user.id,
    content: validated.content,
  });

  // If task is linked to lead or customer, log note in the central activity timeline
  const task = await findTaskById(taskId);
  if (task && (task.leadId || task.customerId)) {
    logSystemEvent({
      leadId: task.leadId,
      customerId: task.customerId,
      userId: user.id,
      type: "note",
      subject: `Added note on task "${task.title}"`,
      description: validated.content,
      metadata: {
        taskId: task.id,
        taskTitle: task.title,
        noteId: note.id,
      },
    }).catch(() => {});
  }

  return note;
}

/**
 * Update content of a note. Allowed for author or managers/admins.
 */
export async function updateTaskNote(
  taskId: string,
  noteId: string,
  input: UpdateTaskNoteInput
): Promise<TaskNoteItem> {
  const user = await checkTaskAccess(taskId, "edit");
  const validated = updateTaskNoteSchema.parse(input);

  const existing = await findNoteById(noteId);
  if (!existing || existing.taskId !== taskId) {
    throw new AppError("Task note not found.", 404, "NOT_FOUND");
  }

  const isAuthor = existing.userId === user.id;
  const isManagerOrAdmin =
    user.role.code === "super_admin" || user.role.code === "sales_manager";

  if (!isAuthor && !isManagerOrAdmin) {
    throw new AppError(
      "Access denied. You can only edit your own notes.",
      403,
      "FORBIDDEN"
    );
  }

  const updated = await updateNoteRecord(noteId, validated.content);
  if (!updated) {
    throw new AppError("Failed to update task note.", 500, "INTERNAL_ERROR");
  }

  return updated;
}

/**
 * Delete a note. Allowed for author or managers/admins.
 */
export async function deleteTaskNote(
  taskId: string,
  noteId: string
): Promise<{ success: boolean }> {
  const user = await checkTaskAccess(taskId, "edit");

  const existing = await findNoteById(noteId);
  if (!existing || existing.taskId !== taskId) {
    throw new AppError("Task note not found.", 404, "NOT_FOUND");
  }

  const isAuthor = existing.userId === user.id;
  const isManagerOrAdmin =
    user.role.code === "super_admin" || user.role.code === "sales_manager";

  if (!isAuthor && !isManagerOrAdmin) {
    throw new AppError(
      "Access denied. You can only delete your own notes.",
      403,
      "FORBIDDEN"
    );
  }

  const deleted = await deleteNoteRecord(noteId);
  if (!deleted) {
    throw new AppError("Failed to delete task note.", 500, "INTERNAL_ERROR");
  }

  return { success: true };
}
