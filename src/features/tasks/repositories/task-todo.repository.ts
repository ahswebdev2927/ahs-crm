import { db } from "@/db";
import { taskTodos, users } from "@/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import type { TaskTodoItem } from "../types/task.types";

interface TodoDbRow {
  taskTodos: typeof taskTodos.$inferSelect;
  completedByUser: {
    id: string;
    name: string;
    email: string;
  } | null;
}

function mapTodoRow(row: TodoDbRow): TaskTodoItem {
  return {
    id: row.taskTodos.id,
    taskId: row.taskTodos.taskId,
    title: row.taskTodos.title,
    isCompleted: Boolean(row.taskTodos.isCompleted),
    position: row.taskTodos.position,
    completedAt: row.taskTodos.completedAt ? new Date(row.taskTodos.completedAt) : null,
    completedById: row.taskTodos.completedById ?? null,
    createdAt: new Date(row.taskTodos.createdAt),
    updatedAt: new Date(row.taskTodos.updatedAt),
    completedBy: row.completedByUser
      ? {
          id: row.completedByUser.id,
          name: row.completedByUser.name,
          email: row.completedByUser.email,
        }
      : null,
  };
}

/**
 * List all todos for a given task, ordered by position then creation date
 */
export async function findTodosByTaskId(taskId: string): Promise<TaskTodoItem[]> {
  const rows = await db
    .select({
      taskTodos,
      completedByUser: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(taskTodos)
    .leftJoin(users, eq(taskTodos.completedById, users.id))
    .where(eq(taskTodos.taskId, taskId))
    .orderBy(asc(taskTodos.position), asc(taskTodos.createdAt));

  return rows.map(mapTodoRow);
}

/**
 * Find a specific todo by its ID
 */
export async function findTodoById(id: string): Promise<TaskTodoItem | null> {
  const rows = await db
    .select({
      taskTodos,
      completedByUser: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(taskTodos)
    .leftJoin(users, eq(taskTodos.completedById, users.id))
    .where(eq(taskTodos.id, id))
    .limit(1);

  if (rows.length === 0) return null;
  return mapTodoRow(rows[0]);
}

/**
 * Create a new checklist item for a task. Defaults position to next available index.
 */
export async function createTodoRecord(data: {
  taskId: string;
  title: string;
  position?: number;
}): Promise<TaskTodoItem> {
  const id = crypto.randomUUID();
  const now = new Date();

  let position = data.position;
  if (position === undefined) {
    const [res] = await db
      .select({
        nextPos: sql<number>`coalesce(max(${taskTodos.position}), -1) + 1`,
      })
      .from(taskTodos)
      .where(eq(taskTodos.taskId, data.taskId));
    position = Number(res?.nextPos ?? 0);
  }

  await db.insert(taskTodos).values({
    id,
    taskId: data.taskId,
    title: data.title,
    position,
    isCompleted: false,
    createdAt: now,
    updatedAt: now,
  });

  const created = await findTodoById(id);
  if (!created) {
    throw new Error("Failed to retrieve created task todo item.");
  }
  return created;
}

/**
 * Update an existing task todo item
 */
export async function updateTodoRecord(
  id: string,
  data: {
    title?: string;
    isCompleted?: boolean;
    position?: number;
    completedAt?: Date | null;
    completedById?: string | null;
  }
): Promise<TaskTodoItem | null> {
  const now = new Date();
  const updateValues: Record<string, unknown> = {
    updatedAt: now,
  };

  if (data.title !== undefined) updateValues.title = data.title;
  if (data.isCompleted !== undefined) updateValues.isCompleted = data.isCompleted;
  if (data.position !== undefined) updateValues.position = data.position;
  if (data.completedAt !== undefined) updateValues.completedAt = data.completedAt;
  if (data.completedById !== undefined) updateValues.completedById = data.completedById;

  await db.update(taskTodos).set(updateValues).where(eq(taskTodos.id, id));

  return findTodoById(id);
}

/**
 * Delete a task todo item
 */
export async function deleteTodoRecord(id: string): Promise<boolean> {
  const res = await db.delete(taskTodos).where(eq(taskTodos.id, id));
  const info = res as unknown as { changes?: number };
  return (info?.changes ?? 0) !== 0;
}

/**
 * Reorder a list of task todos
 */
export async function reorderTodosRecord(
  taskId: string,
  orderedIds: string[]
): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(taskTodos)
        .set({ position: i, updatedAt: new Date() })
        .where(and(eq(taskTodos.id, orderedIds[i]), eq(taskTodos.taskId, taskId)));
    }
  });
}
