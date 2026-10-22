import { AppError } from "@/lib/errors/AppError";
import { checkTaskAccess } from "@/features/auth/services/authorization.service";
import {
  findTodosByTaskId,
  findTodoById,
  createTodoRecord,
  updateTodoRecord,
  deleteTodoRecord,
  reorderTodosRecord,
} from "../repositories/task-todo.repository";
import {
  createTaskTodoSchema,
  updateTaskTodoSchema,
  reorderTaskTodosSchema,
  type CreateTaskTodoInput,
  type UpdateTaskTodoInput,
  type ReorderTaskTodosInput,
} from "../schemas/task-todo.schema";
import type { TaskTodoItem } from "../types/task.types";

/**
 * Retrieve all todos (checklist items) for a given task
 */
export async function getTaskTodos(taskId: string): Promise<TaskTodoItem[]> {
  await checkTaskAccess(taskId, "view");
  return findTodosByTaskId(taskId);
}

/**
 * Add a new checklist item to a task
 */
export async function createTaskTodo(
  taskId: string,
  input: CreateTaskTodoInput
): Promise<TaskTodoItem> {
  await checkTaskAccess(taskId, "edit");
  const validated = createTaskTodoSchema.parse(input);

  return createTodoRecord({
    taskId,
    title: validated.title,
    position: validated.position,
  });
}

/**
 * Update a checklist item (title, isCompleted toggle, position)
 */
export async function updateTaskTodo(
  taskId: string,
  todoId: string,
  input: UpdateTaskTodoInput
): Promise<TaskTodoItem> {
  const user = await checkTaskAccess(taskId, "edit");
  const validated = updateTaskTodoSchema.parse(input);

  const existing = await findTodoById(todoId);
  if (!existing || existing.taskId !== taskId) {
    throw new AppError("Checklist item not found.", 404, "NOT_FOUND");
  }

  const updateData: {
    title?: string;
    isCompleted?: boolean;
    position?: number;
    completedAt?: Date | null;
    completedById?: string | null;
  } = {};

  if (validated.title !== undefined) {
    updateData.title = validated.title;
  }

  if (validated.position !== undefined) {
    updateData.position = validated.position;
  }

  if (validated.isCompleted !== undefined) {
    updateData.isCompleted = validated.isCompleted;
    if (validated.isCompleted) {
      updateData.completedAt = new Date();
      updateData.completedById = user.id;
    } else {
      updateData.completedAt = null;
      updateData.completedById = null;
    }
  }

  const updated = await updateTodoRecord(todoId, updateData);
  if (!updated) {
    throw new AppError("Failed to update checklist item.", 500, "INTERNAL_ERROR");
  }

  return updated;
}

/**
 * Delete a checklist item from a task
 */
export async function deleteTaskTodo(
  taskId: string,
  todoId: string
): Promise<{ success: boolean }> {
  await checkTaskAccess(taskId, "edit");

  const existing = await findTodoById(todoId);
  if (!existing || existing.taskId !== taskId) {
    throw new AppError("Checklist item not found.", 404, "NOT_FOUND");
  }

  const deleted = await deleteTodoRecord(todoId);
  if (!deleted) {
    throw new AppError("Failed to delete checklist item.", 500, "INTERNAL_ERROR");
  }

  return { success: true };
}

/**
 * Reorder checklist items for a task
 */
export async function reorderTaskTodos(
  taskId: string,
  input: ReorderTaskTodosInput
): Promise<{ success: boolean }> {
  await checkTaskAccess(taskId, "edit");
  const validated = reorderTaskTodosSchema.parse(input);

  await reorderTodosRecord(taskId, validated.todoIds);
  return { success: true };
}
