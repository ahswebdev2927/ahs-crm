import { db } from "@/db";
import { leads, customers, users } from "@/db/schema";
import { sendNotification } from "@/features/notifications/services/notification.service";
import { eq, and, isNull } from "drizzle-orm";
import { AppError } from "@/lib/errors/AppError";
import { logSystemEvent } from "@/features/activities/services/activity.service";
import {
  checkPermission,
  checkTaskAccess,
  checkLeadAccess,
  checkCustomerAccess,
  getTaskVisibilityFilter,
} from "@/features/auth/services/authorization.service";
import {
  findTasks,
  findTaskById,
  findTasksByLeadId,
  findTasksByCustomerId,
  createTaskRecord,
  updateTaskRecord,
  updateTaskStatusRecord,
  deleteTaskRecord,
  getTaskMetricsRepo,
} from "../repositories/task.repository";
import {
  taskQuerySchema,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  type TaskQueryInput,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TaskStatus,
} from "../schemas/task.schema";
import type { TaskItem, TaskMetrics, TaskListResponse } from "../types/task.types";

/**
 * Dispatches an in-app and push notification when a task is assigned to a team member
 */
async function dispatchTaskAssignedNotification(
  assignedToId: string,
  taskTitle: string,
  taskId: string,
  dueDate: Date | null
) {
  try {
    const dueStr = dueDate ? ` (Due: ${dueDate.toLocaleDateString()})` : "";
    await sendNotification({
      recipientId: assignedToId,
      title: "New Task Assigned",
      message: `You have been assigned to task: "${taskTitle}"${dueStr}.`,
      category: "tasks",
      type: "task:assigned",
      actionUrl: `/tasks/${taskId}`,
      referenceId: taskId,
    });
  } catch (err) {
    console.error("Failed to dispatch task assigned notification:", err);
  }
}

/**
 * Logs task activity in the central activities table
 */
async function logTaskActivity(
  task: TaskItem,
  userId: string,
  type: "task_created" | "task_completed" | "task_status_changed",
  subject: string,
  description?: string
) {
  await logSystemEvent({
    leadId: task.leadId,
    customerId: task.customerId,
    userId,
    type,
    subject,
    description: description ?? null,
    metadata: {
      taskId: task.id,
      taskTitle: task.title,
      priority: task.priority,
      status: task.status,
    },
  });
}

/**
 * Query tasks with visibility filters, search, pagination, and presets
 */
export async function getTasks(
  params: TaskQueryInput
): Promise<TaskListResponse> {
  const user = await checkPermission("tasks:view");
  const validatedParams = taskQuerySchema.parse(params);

  // If user requests "me" for assignee, resolve to their own ID
  if (validatedParams.assignedToId === "me") {
    validatedParams.assignedToId = user.id;
  }

  const visibilityFilter = getTaskVisibilityFilter(
    user.id,
    user.role.code,
    user.dataVisibility,
    user.teamId
  );

  const { tasks: items, total } = await findTasks(visibilityFilter, validatedParams);
  const totalPages = Math.ceil(total / validatedParams.limit) || 1;

  return {
    tasks: items,
    pagination: {
      total,
      page: validatedParams.page,
      limit: validatedParams.limit,
      totalPages,
    },
  };
}

/**
 * Retrieve single task by ID with access control
 */
export async function getTask(id: string): Promise<TaskItem> {
  await checkTaskAccess(id, "view");
  const task = await findTaskById(id);
  if (!task) {
    throw new AppError("Task not found.", 404, "NOT_FOUND");
  }
  return task;
}

/**
 * Retrieve task metrics (Total, Pending, In Progress, Completed, Overdue, High Priority)
 */
export async function getTaskMetrics(): Promise<TaskMetrics> {
  const user = await checkPermission("tasks:view");
  const visibilityFilter = getTaskVisibilityFilter(
    user.id,
    user.role.code,
    user.dataVisibility,
    user.teamId
  );
  return getTaskMetricsRepo(visibilityFilter);
}

/**
 * Get tasks associated with a specific lead
 */
export async function getLeadTasks(leadId: string): Promise<TaskItem[]> {
  await checkLeadAccess(leadId, "view");
  return findTasksByLeadId(leadId);
}

/**
 * Get tasks associated with a specific customer
 */
export async function getCustomerTasks(customerId: string): Promise<TaskItem[]> {
  await checkCustomerAccess(customerId, "view");
  return findTasksByCustomerId(customerId);
}

/**
 * Create a new task with validation, activity logging, and assignment notification
 */
export async function createTask(input: CreateTaskInput): Promise<TaskItem> {
  const user = await checkPermission("tasks:create");
  const validatedInput = createTaskSchema.parse(input);

  // Verify related lead existence if provided
  if (validatedInput.leadId) {
    const lead = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, validatedInput.leadId), isNull(leads.deletedAt)))
      .get();
    if (!lead) {
      throw new AppError("Referenced lead not found.", 404, "NOT_FOUND");
    }
  }

  // Verify related customer existence if provided
  if (validatedInput.customerId) {
    const customer = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, validatedInput.customerId), isNull(customers.deletedAt)))
      .get();
    if (!customer) {
      throw new AppError("Referenced customer not found.", 404, "NOT_FOUND");
    }
  }

  // Verify assignee existence and active status if assigned
  if (validatedInput.assignedToId) {
    const assignee = await db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, validatedInput.assignedToId))
      .get();
    if (!assignee) {
      throw new AppError("Assigned user not found.", 404, "NOT_FOUND");
    }
    if (assignee.status !== "active") {
      throw new AppError("Cannot assign task to an inactive user.", 400, "BAD_REQUEST");
    }
  }

  const task = await createTaskRecord(validatedInput, user.id);

  // Dispatch assignment notification if assigned to another user
  if (task.assignedToId && task.assignedToId !== user.id) {
    await dispatchTaskAssignedNotification(
      task.assignedToId,
      task.title,
      task.id,
      task.dueDate
    );
  }

  // Log creation activity
  await logTaskActivity(
    task,
    user.id,
    "task_created",
    `Task created: "${task.title}"`,
    task.description ?? undefined
  );

  return task;
}

/**
 * Update task fields with access control, status tracking, and notification dispatch
 */
export async function updateTask(
  id: string,
  input: UpdateTaskInput
): Promise<TaskItem> {
  const user = await checkTaskAccess(id, "edit");
  const validatedInput = updateTaskSchema.parse(input);

  const existing = await findTaskById(id);
  if (!existing) {
    throw new AppError("Task not found.", 404, "NOT_FOUND");
  }

  // Verify assignee if changing
  if (validatedInput.assignedToId) {
    const assignee = await db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, validatedInput.assignedToId))
      .get();
    if (!assignee) {
      throw new AppError("Assigned user not found.", 404, "NOT_FOUND");
    }
    if (assignee.status !== "active") {
      throw new AppError("Cannot assign task to an inactive user.", 400, "BAD_REQUEST");
    }
  }

  const updated = await updateTaskRecord(id, validatedInput);
  if (!updated) {
    throw new AppError("Failed to update task.", 500, "INTERNAL_ERROR");
  }

  // If newly assigned or reassigned to another user, dispatch notification
  if (
    updated.assignedToId &&
    updated.assignedToId !== existing.assignedToId &&
    updated.assignedToId !== user.id
  ) {
    await dispatchTaskAssignedNotification(
      updated.assignedToId,
      updated.title,
      updated.id,
      updated.dueDate
    );
  }

  // Log status change activity if status transitioned
  if (validatedInput.status && validatedInput.status !== existing.status) {
    const type =
      validatedInput.status === "completed"
        ? "task_completed"
        : "task_status_changed";
    await logTaskActivity(
      updated,
      user.id,
      type,
      `Task status changed from "${existing.status}" to "${validatedInput.status}"`
    );
  }

  return updated;
}

/**
 * Quick status transition (for Kanban drag & drop and checklist toggle)
 */
export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<TaskItem> {
  const user = await checkTaskAccess(id, "edit");
  const validated = updateTaskStatusSchema.parse({ status });

  const existing = await findTaskById(id);
  if (!existing) {
    throw new AppError("Task not found.", 404, "NOT_FOUND");
  }

  if (existing.status === validated.status) {
    return existing;
  }

  const updated = await updateTaskStatusRecord(id, validated.status);
  if (!updated) {
    throw new AppError("Failed to update task status.", 500, "INTERNAL_ERROR");
  }

  const type =
    validated.status === "completed"
      ? "task_completed"
      : "task_status_changed";

  await logTaskActivity(
    updated,
    user.id,
    type,
    `Task marked as "${validated.status}"`
  );

  return updated;
}

/**
 * Soft delete a task with access verification
 */
export async function deleteTask(id: string): Promise<boolean> {
  await checkTaskAccess(id, "delete");
  const deleted = await deleteTaskRecord(id, true);
  if (!deleted) {
    throw new AppError("Task not found or already deleted.", 404, "NOT_FOUND");
  }
  return true;
}
