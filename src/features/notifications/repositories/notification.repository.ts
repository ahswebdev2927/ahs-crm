import { db } from "@/db";
import { notifications, type NewNotification } from "@/db/schema/notifications";
import {
  eq,
  and,
  or,
  like,
  desc,
  count,
  lt,
  SQL,
} from "drizzle-orm";
import type {
  NotificationItem,
  NotificationListFilter,
  NotificationCategory,
} from "../types";

function mapDbRowToItem(row: typeof notifications.$inferSelect): NotificationItem {
  return {
    id: row.id,
    recipientId: row.recipientId,
    title: row.title,
    message: row.message,
    type: row.type,
    category: row.category as NotificationCategory,
    referenceId: row.referenceId,
    actionUrl: row.actionUrl,
    isRead: row.isRead === 1,
    readAt: row.readAt ? new Date(row.readAt) : null,
    createdAt: new Date(row.createdAt),
  };
}

/**
 * Finds paginated notifications for a specific user with optional filters
 */
export async function findNotificationsByUser(
  userId: string,
  filter: NotificationListFilter = {}
): Promise<{ items: NotificationItem[]; total: number }> {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [eq(notifications.recipientId, userId)];

  if (filter.isRead !== undefined) {
    conditions.push(eq(notifications.isRead, filter.isRead ? 1 : 0));
  }

  if (filter.category) {
    conditions.push(eq(notifications.category, filter.category));
  }

  if (filter.search && filter.search.trim()) {
    const term = `%${filter.search.trim()}%`;
    conditions.push(
      or(
        like(notifications.title, term),
        like(notifications.message, term)
      )!
    );
  }

  const whereClause = and(...conditions);

  const [totalRes, rows] = await Promise.all([
    db
      .select({ count: count() })
      .from(notifications)
      .where(whereClause),
    db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(totalRes[0]?.count ?? 0);
  const items = rows.map(mapDbRowToItem);

  return { items, total };
}

/**
 * Returns fast scalar count of unread notifications for a user
 */
export async function countUnreadByUser(userId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, userId),
        eq(notifications.isRead, 0)
      )
    );

  return Number(result[0]?.count ?? 0);
}

/**
 * Finds a single notification by ID
 */
export async function findNotificationById(id: string): Promise<NotificationItem | null> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, id))
    .limit(1);

  if (!rows.length) return null;
  return mapDbRowToItem(rows[0]);
}

/**
 * Creates and persists a new notification record
 */
export async function createNotificationRecord(
  data: Omit<NewNotification, "id" | "isRead" | "createdAt" | "readAt"> & {
    id?: string;
    actionUrl?: string | null;
    referenceId?: string | null;
  }
): Promise<NotificationItem> {
  const id = data.id || crypto.randomUUID();
  const insertValues: NewNotification = {
    id,
    recipientId: data.recipientId,
    title: data.title,
    message: data.message,
    type: data.type,
    category: data.category || "system",
    referenceId: data.referenceId ?? null,
    actionUrl: data.actionUrl ?? null,
    isRead: 0,
    readAt: null,
    createdAt: new Date(),
  };

  await db.insert(notifications).values(insertValues);
  const created = await findNotificationById(id);
  if (!created) {
    throw new Error(`Failed to retrieve newly created notification with id ${id}`);
  }
  return created;
}

/**
 * Marks a single notification as read for a given user
 */
export async function markNotificationAsRead(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .update(notifications)
    .set({
      isRead: 1,
      readAt: new Date(),
    })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.recipientId, userId)
      )
    );

  const affected = (result as unknown as { rowsAffected?: number; changes?: number }).rowsAffected ??
    (result as unknown as { rowsAffected?: number; changes?: number }).changes ??
    0;

  return affected > 0;
}

/**
 * Marks all unread notifications as read for a given user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const result = await db
    .update(notifications)
    .set({
      isRead: 1,
      readAt: new Date(),
    })
    .where(
      and(
        eq(notifications.recipientId, userId),
        eq(notifications.isRead, 0)
      )
    );

  return (
    (result as unknown as { rowsAffected?: number; changes?: number }).rowsAffected ??
    (result as unknown as { rowsAffected?: number; changes?: number }).changes ??
    0
  );
}

/**
 * Deletes all read notifications for a user (manual cleanup)
 */
export async function deleteReadNotifications(userId: string): Promise<number> {
  const result = await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.recipientId, userId),
        eq(notifications.isRead, 1)
      )
    );

  return (
    (result as unknown as { rowsAffected?: number; changes?: number }).rowsAffected ??
    (result as unknown as { rowsAffected?: number; changes?: number }).changes ??
    0
  );
}

/**
 * System purge for read notifications older than a given date cutoff (e.g. 60 days)
 */
export async function purgeOldReadNotifications(cutoffDate: Date): Promise<number> {
  const result = await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.isRead, 1),
        lt(notifications.readAt, cutoffDate)
      )
    );

  return (
    (result as unknown as { rowsAffected?: number; changes?: number }).rowsAffected ??
    (result as unknown as { rowsAffected?: number; changes?: number }).changes ??
    0
  );
}
