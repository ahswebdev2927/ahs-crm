import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import {
  updateTaskTodo,
  deleteTaskTodo,
} from "@/features/tasks/services/task-todo.service";

/**
 * PATCH /api/tasks/[id]/todos/[todoId]
 * Update todo title, completion status, or position
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const rawParams = await context?.params;
  const taskId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const todoId = Array.isArray(rawParams?.todoId) ? rawParams.todoId[0] : rawParams?.todoId || "";
  const body = await request.json();

  const todo = await updateTaskTodo(taskId, todoId, body);

  return successResponse({
    statusCode: 200,
    message: "Task todo updated successfully.",
    data: { todo },
  });
});

/**
 * DELETE /api/tasks/[id]/todos/[todoId]
 * Delete a todo item
 */
export const DELETE = withErrorHandling(async (_request: NextRequest, context) => {
  const rawParams = await context?.params;
  const taskId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const todoId = Array.isArray(rawParams?.todoId) ? rawParams.todoId[0] : rawParams?.todoId || "";

  await deleteTaskTodo(taskId, todoId);

  return successResponse({
    statusCode: 200,
    message: "Task todo deleted successfully.",
    data: { success: true },
  });
});
