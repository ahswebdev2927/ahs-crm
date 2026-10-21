import { db } from "@/db";
import { tasks, leads, customers, users } from "@/db/schema";
import {
  eq,
  and,
  or,
  lt,
  like,
  count,
  desc,
  asc,
  isNull,
  isNotNull,
  sql,
  SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type {
  TaskQueryInput,
  CreateTaskInput,
  UpdateTaskInput,
  TaskPriority,
  TaskStatus,
} from "../schemas/task.schema";
import type { TaskItem, TaskMetrics } from "../types/task.types";

const createdByUsers = alias(users, "createdByUsers");
const assignedToUsers = alias(users, "assignedToUsers");

function mapTaskRow(row: any): TaskItem {
  return {
    id: row.tasks.id,
    title: row.tasks.title,
    description: row.tasks.description ?? null,
    leadId: row.tasks.leadId ?? null,
    customerId: row.tasks.customerId ?? null,
    assignedToId: row.tasks.assignedToId ?? null,
    createdById: row.tasks.createdById,
    dueDate: row.tasks.dueDate ? new Date(row.tasks.dueDate) : null,
    priority: row.tasks.priority as TaskPriority,
    status: row.tasks.status as TaskStatus,
    completedAt: row.tasks.completedAt ? new Date(row.tasks.completedAt) : null,
    createdAt: new Date(row.tasks.createdAt),
    updatedAt: new Date(row.tasks.updatedAt),
    deletedAt: row.tasks.deletedAt ? new Date(row.tasks.deletedAt) : null,
    lead: row.leads?.id
      ? {
          id: row.leads.id,
          contactName: row.leads.name,
          companyName: row.leads.company ?? null,
          email: row.leads.email ?? null,
          phone: row.leads.phone ?? null,
        }
      : null,
    customer: row.customers?.id
      ? {
          id: row.customers.id,
          name: row.customers.name,
          email: row.customers.email ?? null,
          phone: row.customers.phone ?? null,
        }
      : null,
    assignedTo: row.assignedToUsers?.id
      ? {
          id: row.assignedToUsers.id,
          name: row.assignedToUsers.name,
          email: row.assignedToUsers.email,
        }
      : null,
    createdBy: {
      id: row.createdByUsers.id,
      name: row.createdByUsers.name,
      email: row.createdByUsers.email,
    },
  };
}

export async function findTasks(
  visibilityFilter: SQL | undefined,
  params: TaskQueryInput
): Promise<{ tasks: TaskItem[]; total: number }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: (SQL | undefined)[] = [
    isNull(tasks.deletedAt),
    visibilityFilter,
  ];

  if (params.status && params.status !== "all") {
    conditions.push(eq(tasks.status, params.status));
  }

  if (params.priority && params.priority !== "all") {
    conditions.push(eq(tasks.priority, params.priority));
  }

  if (params.assignedToId && params.assignedToId !== "all") {
    if (params.assignedToId === "unassigned") {
      conditions.push(isNull(tasks.assignedToId));
    } else {
      conditions.push(eq(tasks.assignedToId, params.assignedToId));
    }
  }

  if (params.leadId) {
    conditions.push(eq(tasks.leadId, params.leadId));
  }

  if (params.customerId) {
    conditions.push(eq(tasks.customerId, params.customerId));
  }

  if (params.overdue) {
    const now = new Date();
    conditions.push(
      and(
        or(eq(tasks.status, "pending"), eq(tasks.status, "in_progress")),
        isNotNull(tasks.dueDate),
        lt(tasks.dueDate, now)
      )
    );
  }

  if (params.search) {
    const term = `%${params.search}%`;
    conditions.push(
      or(
        like(tasks.title, term),
        like(tasks.description, term),
        like(leads.name, term),
        like(customers.name, term)
      )
    );
  }

  const whereClause = and(...conditions.filter(Boolean));

  // Count total matching items
  const [{ totalCount }] = await db
    .select({ totalCount: count() })
    .from(tasks)
    .leftJoin(leads, eq(tasks.leadId, leads.id))
    .leftJoin(customers, eq(tasks.customerId, customers.id))
    .where(whereClause);

  // Sorting selection
  let orderColumn: any = tasks.dueDate;
  if (params.sortBy === "priority") {
    orderColumn = tasks.priority;
  } else if (params.sortBy === "createdAt") {
    orderColumn = tasks.createdAt;
  } else if (params.sortBy === "status") {
    orderColumn = tasks.status;
  } else if (params.sortBy === "title") {
    orderColumn = tasks.title;
  }

  const orderExpr =
    params.sortOrder === "desc" ? desc(orderColumn) : asc(orderColumn);

  // Query paginated items
  const rows = await db
    .select({
      tasks,
      leads: {
        id: leads.id,
        name: leads.name,
        company: leads.company,
        email: leads.email,
        phone: leads.phone,
      },
      customers: {
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
      },
      createdByUsers: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
      },
      assignedToUsers: {
        id: assignedToUsers.id,
        name: assignedToUsers.name,
        email: assignedToUsers.email,
      },
    })
    .from(tasks)
    .leftJoin(leads, eq(tasks.leadId, leads.id))
    .leftJoin(customers, eq(tasks.customerId, customers.id))
    .innerJoin(createdByUsers, eq(tasks.createdById, createdByUsers.id))
    .leftJoin(assignedToUsers, eq(tasks.assignedToId, assignedToUsers.id))
    .where(whereClause)
    .orderBy(orderExpr)
    .limit(limit)
    .offset(offset);

  return {
    tasks: rows.map(mapTaskRow),
    total: totalCount,
  };
}

export async function findTaskById(id: string): Promise<TaskItem | null> {
  const rows = await db
    .select({
      tasks,
      leads: {
        id: leads.id,
        name: leads.name,
        company: leads.company,
        email: leads.email,
        phone: leads.phone,
      },
      customers: {
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
      },
      createdByUsers: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
      },
      assignedToUsers: {
        id: assignedToUsers.id,
        name: assignedToUsers.name,
        email: assignedToUsers.email,
      },
    })
    .from(tasks)
    .leftJoin(leads, eq(tasks.leadId, leads.id))
    .leftJoin(customers, eq(tasks.customerId, customers.id))
    .innerJoin(createdByUsers, eq(tasks.createdById, createdByUsers.id))
    .leftJoin(assignedToUsers, eq(tasks.assignedToId, assignedToUsers.id))
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
    .limit(1);

  if (rows.length === 0) return null;
  return mapTaskRow(rows[0]);
}

export async function findTasksByLeadId(leadId: string): Promise<TaskItem[]> {
  const rows = await db
    .select({
      tasks,
      leads: {
        id: leads.id,
        name: leads.name,
        company: leads.company,
        email: leads.email,
        phone: leads.phone,
      },
      customers: {
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
      },
      createdByUsers: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
      },
      assignedToUsers: {
        id: assignedToUsers.id,
        name: assignedToUsers.name,
        email: assignedToUsers.email,
      },
    })
    .from(tasks)
    .leftJoin(leads, eq(tasks.leadId, leads.id))
    .leftJoin(customers, eq(tasks.customerId, customers.id))
    .innerJoin(createdByUsers, eq(tasks.createdById, createdByUsers.id))
    .leftJoin(assignedToUsers, eq(tasks.assignedToId, assignedToUsers.id))
    .where(and(eq(tasks.leadId, leadId), isNull(tasks.deletedAt)))
    .orderBy(desc(tasks.createdAt));

  return rows.map(mapTaskRow);
}

export async function findTasksByCustomerId(
  customerId: string
): Promise<TaskItem[]> {
  const rows = await db
    .select({
      tasks,
      leads: {
        id: leads.id,
        name: leads.name,
        company: leads.company,
        email: leads.email,
        phone: leads.phone,
      },
      customers: {
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
      },
      createdByUsers: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
      },
      assignedToUsers: {
        id: assignedToUsers.id,
        name: assignedToUsers.name,
        email: assignedToUsers.email,
      },
    })
    .from(tasks)
    .leftJoin(leads, eq(tasks.leadId, leads.id))
    .leftJoin(customers, eq(tasks.customerId, customers.id))
    .innerJoin(createdByUsers, eq(tasks.createdById, createdByUsers.id))
    .leftJoin(assignedToUsers, eq(tasks.assignedToId, assignedToUsers.id))
    .where(and(eq(tasks.customerId, customerId), isNull(tasks.deletedAt)))
    .orderBy(desc(tasks.createdAt));

  return rows.map(mapTaskRow);
}

export async function createTaskRecord(
  input: CreateTaskInput,
  createdById: string
): Promise<TaskItem> {
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(tasks).values({
    id,
    title: input.title,
    description: input.description ?? null,
    leadId: input.leadId ?? null,
    customerId: input.customerId ?? null,
    assignedToId: input.assignedToId ?? null,
    createdById,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    priority: input.priority ?? "medium",
    status: input.status ?? "pending",
    completedAt: input.status === "completed" ? now : null,
    createdAt: now,
    updatedAt: now,
  });

  const created = await findTaskById(id);
  if (!created) {
    throw new Error("Failed to retrieve created task.");
  }
  return created;
}

export async function updateTaskRecord(
  id: string,
  input: UpdateTaskInput
): Promise<TaskItem | null> {
  const now = new Date();
  const updateValues: Record<string, any> = {
    updatedAt: now,
  };

  if (input.title !== undefined) updateValues.title = input.title;
  if (input.description !== undefined) updateValues.description = input.description;
  if (input.leadId !== undefined) updateValues.leadId = input.leadId;
  if (input.customerId !== undefined) updateValues.customerId = input.customerId;
  if (input.assignedToId !== undefined) updateValues.assignedToId = input.assignedToId;
  if (input.dueDate !== undefined) updateValues.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if (input.priority !== undefined) updateValues.priority = input.priority;

  if (input.status !== undefined) {
    updateValues.status = input.status;
    if (input.status === "completed") {
      updateValues.completedAt = input.completedAt ? new Date(input.completedAt) : now;
    } else {
      updateValues.completedAt = null;
    }
  } else if (input.completedAt !== undefined) {
    updateValues.completedAt = input.completedAt ? new Date(input.completedAt) : null;
  }

  await db
    .update(tasks)
    .set(updateValues)
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)));

  return findTaskById(id);
}

export async function updateTaskStatusRecord(
  id: string,
  status: TaskStatus
): Promise<TaskItem | null> {
  const now = new Date();
  const completedAt = status === "completed" ? now : null;

  await db
    .update(tasks)
    .set({
      status,
      completedAt,
      updatedAt: now,
    })
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)));

  return findTaskById(id);
}

export async function deleteTaskRecord(
  id: string,
  soft: boolean = true
): Promise<boolean> {
  const now = new Date();
  if (soft) {
    const res = await db
      .update(tasks)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)));
    return (res as any)?.changes !== 0;
  } else {
    const res = await db.delete(tasks).where(eq(tasks.id, id));
    return (res as any)?.changes !== 0;
  }
}

export async function getTaskMetrics(
  visibilityFilter: SQL | undefined
): Promise<TaskMetrics> {
  const now = Date.now();
  const whereClause = and(isNull(tasks.deletedAt), visibilityFilter);

  const [res] = await db
    .select({
      total: count(),
      pending: sql<number>`coalesce(sum(case when ${tasks.status} = 'pending' then 1 else 0 end), 0)`,
      inProgress: sql<number>`coalesce(sum(case when ${tasks.status} = 'in_progress' then 1 else 0 end), 0)`,
      completed: sql<number>`coalesce(sum(case when ${tasks.status} = 'completed' then 1 else 0 end), 0)`,
      overdue: sql<number>`coalesce(sum(case when ${tasks.status} in ('pending', 'in_progress') and ${tasks.dueDate} is not null and ${tasks.dueDate} < ${now} then 1 else 0 end), 0)`,
      highPriority: sql<number>`coalesce(sum(case when ${tasks.priority} in ('high', 'critical') and ${tasks.status} != 'completed' then 1 else 0 end), 0)`,
    })
    .from(tasks)
    .where(whereClause);

  return {
    total: Number(res?.total ?? 0),
    pending: Number(res?.pending ?? 0),
    inProgress: Number(res?.inProgress ?? 0),
    completed: Number(res?.completed ?? 0),
    overdue: Number(res?.overdue ?? 0),
    highPriority: Number(res?.highPriority ?? 0),
  };
}
