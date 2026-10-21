import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import {
  getTask,
  updateTask,
  deleteTask,
} from "@/features/tasks/services/task.service";

/**
 * GET /api/tasks/[id]
 * Retrieves single task details with relational summaries.
 */
export const GET = withErrorHandling(async (_request: NextRequest, context) => {
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const task = await getTask(id);

  return successResponse({
    statusCode: 200,
    message: "Task retrieved successfully.",
    data: { task },
  });
});

/**
 * PATCH /api/tasks/[id]
 * Updates task fields (title, description, due date, priority, assignee, etc.).
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const task = await updateTask(id, body);

  return successResponse({
    statusCode: 200,
    message: "Task updated successfully.",
    data: { task },
  });
});

/**
 * DELETE /api/tasks/[id]
 * Soft deletes a task.
 */
export const DELETE = withErrorHandling(async (_request: NextRequest, context) => {
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  await deleteTask(id);

  return successResponse({
    statusCode: 200,
    message: "Task deleted successfully.",
    data: { success: true },
  });
});
