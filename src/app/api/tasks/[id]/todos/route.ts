import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import {
  getTaskTodos,
  createTaskTodo,
  reorderTaskTodos,
} from "@/features/tasks/services/task-todo.service";

/**
 * GET /api/tasks/[id]/todos
 * List all checklist todos for a task
 */
export const GET = withErrorHandling(async (_request: NextRequest, context) => {
  const rawParams = await context?.params;
  const taskId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const todos = await getTaskTodos(taskId);

  return successResponse({
    statusCode: 200,
    message: "Task todos retrieved successfully.",
    data: { todos },
  });
});

/**
 * POST /api/tasks/[id]/todos
 * Add a new checklist todo item to a task
 */
export const POST = withErrorHandling(async (request: NextRequest, context) => {
  const rawParams = await context?.params;
  const taskId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const todo = await createTaskTodo(taskId, body);

  return successResponse({
    statusCode: 201,
    message: "Task todo created successfully.",
    data: { todo },
  });
});

/**
 * PUT /api/tasks/[id]/todos
 * Reorder checklist todos for a task
 */
export const PUT = withErrorHandling(async (request: NextRequest, context) => {
  const rawParams = await context?.params;
  const taskId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  await reorderTaskTodos(taskId, body);

  return successResponse({
    statusCode: 200,
    message: "Task todos reordered successfully.",
    data: { success: true },
  });
});
