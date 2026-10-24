import { db } from "@/db";
import { activities, users, customers, type Activity, type NewActivity } from "@/db/schema";
import { eq, and, or, like, desc, isNull, count } from "drizzle-orm";
import type { ActivityQueryInput } from "../schemas/activity.schema";
import type { ActivityCategoryCounts } from "../types/activity.types";

export interface ActivityWithUser extends Activity {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

/**
 * Finds activities based on filter criteria, joined with author details.
 * Supports continuous origin lead history when querying a customer timeline.
 */
export async function findActivities(
  query: ActivityQueryInput,
  customerOriginLeadId?: string | null
): Promise<{
  items: ActivityWithUser[];
  total: number;
  counts: ActivityCategoryCounts;
}> {
  const { leadId, customerId, category, type, search, page, limit } = query;

  // 1. Target entity condition
  let targetCondition = undefined;
  if (leadId) {
    targetCondition = eq(activities.leadId, leadId);
  } else if (customerId) {
    if (customerOriginLeadId) {
      targetCondition = or(
        eq(activities.customerId, customerId),
        eq(activities.leadId, customerOriginLeadId)
      );
    } else {
      targetCondition = eq(activities.customerId, customerId);
    }
  }

  // Common base condition: must belong to the entity and not be soft-deleted
  const baseCondition = and(
    targetCondition,
    isNull(activities.deletedAt)
  );

  // 2. Additional filter conditions
  const filterConditions = [baseCondition];

  if (category && category !== "all") {
    filterConditions.push(eq(activities.category, category));
  }

  if (type) {
    filterConditions.push(eq(activities.type, type));
  }

  if (search && search.trim().length > 0) {
    const searchPattern = `%${search.trim()}%`;
    filterConditions.push(
      or(
        like(activities.subject, searchPattern),
        like(activities.description, searchPattern),
        like(activities.type, searchPattern),
        like(activities.outcome, searchPattern)
      )
    );
  }

  const finalWhere = and(...filterConditions);

  // 3. Query paginated items with joined user
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      activity: activities,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(activities)
    .leftJoin(users, eq(activities.userId, users.id))
    .where(finalWhere)
    .orderBy(desc(activities.createdAt))
    .limit(limit)
    .offset(offset);

  const items: ActivityWithUser[] = rows.map((r) => ({
    ...r.activity,
    user: r.user && r.user.id ? r.user : null,
  }));

  // 4. Total count for current filtered query
  const totalResult = await db
    .select({ count: count() })
    .from(activities)
    .where(finalWhere)
    .get();

  const total = totalResult?.count || 0;

  // 5. Calculate category counts for current entity (unfiltered by category/search/type)
  const categoryCountsRaw = await db
    .select({
      category: activities.category,
      count: count(),
    })
    .from(activities)
    .where(baseCondition)
    .groupBy(activities.category);

  let communicationCount = 0;
  let lifecycleCount = 0;
  let commercialCount = 0;

  for (const row of categoryCountsRaw) {
    if (row.category === "communication") {
      communicationCount = row.count;
    } else if (row.category === "lifecycle") {
      lifecycleCount = row.count;
    } else if (row.category === "commercial") {
      commercialCount = row.count;
    }
  }

  const counts: ActivityCategoryCounts = {
    all: communicationCount + lifecycleCount + commercialCount,
    communication: communicationCount,
    lifecycle: lifecycleCount,
    commercial: commercialCount,
  };

  return { items, total, counts };
}

/**
 * Finds a single activity by ID with author details.
 */
export async function findActivityById(id: string): Promise<ActivityWithUser | null> {
  const row = await db
    .select({
      activity: activities,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(activities)
    .leftJoin(users, eq(activities.userId, users.id))
    .where(eq(activities.id, id))
    .get();

  if (!row) return null;

  return {
    ...row.activity,
    user: row.user && row.user.id ? row.user : null,
  };
}

/**
 * Looks up a customer's origin lead ID if available.
 */
export async function findCustomerOriginLeadId(customerId: string): Promise<string | null> {
  const customer = await db
    .select({ leadId: customers.leadId })
    .from(customers)
    .where(eq(customers.id, customerId))
    .get();

  return customer?.leadId ?? null;
}

/**
 * Creates a new activity record.
 */
export async function createActivityRecord(data: NewActivity): Promise<Activity> {
  return await db.insert(activities).values(data).returning().get();
}

/**
 * Updates an existing activity record.
 */
export async function updateActivityRecord(
  id: string,
  data: Partial<NewActivity>
): Promise<Activity> {
  return await db
    .update(activities)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, id))
    .returning()
    .get();
}

/**
 * Soft-deletes a manual activity record.
 */
export async function softDeleteActivityRecord(id: string): Promise<void> {
  await db
    .update(activities)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(activities.id, id));
}
