import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import {
  updateTaskNote,
  deleteTaskNote,
} from "@/features/tasks/services/task-note.service";

/**
 * PATCH /api/tasks/[id]/notes/[noteId]
 * Update an existing task note
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const rawParams = await context?.params;
  const taskId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const noteId = Array.isArray(rawParams?.noteId) ? rawParams.noteId[0] : rawParams?.noteId || "";
  const body = await request.json();

  const note = await updateTaskNote(taskId, noteId, body);

  return successResponse({
    statusCode: 200,
    message: "Task note updated successfully.",
    data: { note },
  });
});

/**
 * DELETE /api/tasks/[id]/notes/[noteId]
 * Delete a task note
 */
export const DELETE = withErrorHandling(async (_request: NextRequest, context) => {
  const rawParams = await context?.params;
  const taskId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const noteId = Array.isArray(rawParams?.noteId) ? rawParams.noteId[0] : rawParams?.noteId || "";

  await deleteTaskNote(taskId, noteId);

  return successResponse({
    statusCode: 200,
    message: "Task note deleted successfully.",
    data: { success: true },
  });
});
