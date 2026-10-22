import { db } from "@/db";
import { taskNotes, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { TaskNoteItem } from "../types/task.types";

interface NoteDbRow {
  taskNotes: typeof taskNotes.$inferSelect;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

function mapNoteRow(row: NoteDbRow): TaskNoteItem {
  return {
    id: row.taskNotes.id,
    taskId: row.taskNotes.taskId,
    userId: row.taskNotes.userId,
    content: row.taskNotes.content,
    createdAt: new Date(row.taskNotes.createdAt),
    updatedAt: new Date(row.taskNotes.updatedAt),
    user: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
    },
  };
}

/**
 * List all notes for a task, newest first
 */
export async function findNotesByTaskId(taskId: string): Promise<TaskNoteItem[]> {
  const rows = await db
    .select({
      taskNotes,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(taskNotes)
    .innerJoin(users, eq(taskNotes.userId, users.id))
    .where(eq(taskNotes.taskId, taskId))
    .orderBy(desc(taskNotes.createdAt));

  return rows.map(mapNoteRow);
}

/**
 * Find a specific note by ID
 */
export async function findNoteById(id: string): Promise<TaskNoteItem | null> {
  const rows = await db
    .select({
      taskNotes,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(taskNotes)
    .innerJoin(users, eq(taskNotes.userId, users.id))
    .where(eq(taskNotes.id, id))
    .limit(1);

  if (rows.length === 0) return null;
  return mapNoteRow(rows[0]);
}

/**
 * Create a new task note
 */
export async function createNoteRecord(data: {
  taskId: string;
  userId: string;
  content: string;
}): Promise<TaskNoteItem> {
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(taskNotes).values({
    id,
    taskId: data.taskId,
    userId: data.userId,
    content: data.content,
    createdAt: now,
    updatedAt: now,
  });

  const created = await findNoteById(id);
  if (!created) {
    throw new Error("Failed to retrieve created task note.");
  }
  return created;
}

/**
 * Update content of an existing note
 */
export async function updateNoteRecord(
  id: string,
  content: string
): Promise<TaskNoteItem | null> {
  const now = new Date();
  await db
    .update(taskNotes)
    .set({
      content,
      updatedAt: now,
    })
    .where(eq(taskNotes.id, id));

  return findNoteById(id);
}

/**
 * Delete a note
 */
export async function deleteNoteRecord(id: string): Promise<boolean> {
  const res = await db.delete(taskNotes).where(eq(taskNotes.id, id));
  const info = res as unknown as { changes?: number };
  return (info?.changes ?? 0) !== 0;
}
