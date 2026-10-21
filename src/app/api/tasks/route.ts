import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import {
  getTasks,
  createTask,
} from "@/features/tasks/services/task.service";
import { taskQuerySchema } from "@/features/tasks";

/**
 * GET /api/tasks
 * Lists tasks with filtering, search, pagination, and data visibility rules.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());
  const parsed = taskQuerySchema.parse(queryParams);

  const result = await getTasks(parsed);

  return successResponse({
    statusCode: 200,
    message: "Tasks retrieved successfully.",
    data: result,
  });
});

/**
 * POST /api/tasks
 * Creates a new action task, logs activity, and dispatches assignment notifications.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  const task = await createTask(body);

  return successResponse({
    statusCode: 201,
    message: "Task created successfully.",
    data: { task },
  });
});
