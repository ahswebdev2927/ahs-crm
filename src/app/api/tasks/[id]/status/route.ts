import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { updateTaskStatus } from "@/features/tasks/services/task.service";

/**
 * PATCH /api/tasks/[id]/status
 * Quick status transition endpoint for Kanban drag-and-drop and checkbox toggle.
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const task = await updateTaskStatus(id, body.status);

  return successResponse({
    statusCode: 200,
    message: "Task status updated successfully.",
    data: { task },
  });
});
