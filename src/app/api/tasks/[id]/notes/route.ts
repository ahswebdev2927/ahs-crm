import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import {
  getTaskNotes,
  createTaskNote,
} from "@/features/tasks/services/task-note.service";

/**
 * GET /api/tasks/[id]/notes
 * List all notes for a task
 */
export const GET = withErrorHandling(async (_request: NextRequest, context) => {
  const rawParams = await context?.params;
  const taskId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const notes = await getTaskNotes(taskId);

  return successResponse({
    statusCode: 200,
    message: "Task notes retrieved successfully.",
    data: { notes },
  });
});

/**
 * POST /api/tasks/[id]/notes
 * Add a new note to a task
 */
export const POST = withErrorHandling(async (request: NextRequest, context) => {
  const rawParams = await context?.params;
  const taskId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const note = await createTaskNote(taskId, body);

  return successResponse({
    statusCode: 201,
    message: "Task note created successfully.",
    data: { note },
  });
});
