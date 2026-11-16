import { db } from "@/db";
import { eq, and, or, like, desc, asc, count, gte, lte, isNotNull } from "drizzle-orm";
import { auditLogs, users, roles } from "@/db/schema";
import type {
  AuditQueryInput,
  AuditLogRecord,
  AuditFilterOptions,
} from "../schemas/audit.schema";

/**
 * Safely parses stringified JSON into an object or returns a fallback wrapper.
 */
function parseJsonSafely(val: string | null): Record<string, any> | null {
  if (!val) return null;
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
    return { value: parsed };
  } catch {
    return { raw: val };
  }
}

/**
 * Builds array of SQL conditions based on input filter params.
 */
function buildConditions(filters: Partial<AuditQueryInput>) {
  const conditions: any[] = [];

  if (filters.entityType && filters.entityType.trim() !== "") {
    conditions.push(eq(auditLogs.entityType, filters.entityType.trim()));
  }

  if (filters.action && filters.action.trim() !== "") {
    conditions.push(eq(auditLogs.action, filters.action.trim()));
  }

  if (filters.userId && filters.userId.trim() !== "") {
    conditions.push(eq(auditLogs.userId, filters.userId.trim()));
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate);
    if (!isNaN(start.getTime())) {
      conditions.push(gte(auditLogs.createdAt, start));
    }
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    if (!isNaN(end.getTime())) {
      if (filters.endDate.length === 10) {
        end.setHours(23, 59, 59, 999);
      }
      conditions.push(lte(auditLogs.createdAt, end));
    }
  }

  if (filters.search && filters.search.trim() !== "") {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        like(auditLogs.action, term),
        like(auditLogs.entityType, term),
        like(auditLogs.entityId, term),
        like(auditLogs.ipAddress, term),
        like(users.name, term),
        like(users.email, term)
      )
    );
  }

  return conditions;
}

/**
 * Maps raw join query row into a strongly typed AuditLogRecord.
 */
function mapAuditRow(r: any): AuditLogRecord {
  return {
    id: r.id,
    userId: r.userId,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    oldData: parseJsonSafely(r.oldData),
    newData: parseJsonSafely(r.newData),
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
    user: r.userId
      ? {
          id: r.userId,
          name: r.userName || "System User",
          email: r.userEmail || "",
          roleCode: r.userRoleCode || null,
          roleName: r.userRoleName || null,
        }
      : null,
  };
}

/**
 * Queries paginated audit logs with joined user actor information.
 */
export async function findAuditLogs(
  filters: AuditQueryInput
): Promise<{ items: AuditLogRecord[]; total: number }> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = buildConditions(filters);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 1. Fetch total count matching conditions
  const countQuery = db
    .select({ total: count() })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id));

  const [countResult] = whereClause
    ? await countQuery.where(whereClause)
    : await countQuery;
  const total = Number(countResult?.total ?? 0);

  // 2. Query paginated records
  const query = db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      oldData: auditLogs.oldData,
      newData: auditLogs.newData,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
      userName: users.name,
      userEmail: users.email,
      userRoleCode: roles.code,
      userRoleName: roles.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(roles, eq(users.roleId, roles.id));

  const rows = whereClause
    ? await query
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(limit)
        .offset(offset)
    : await query
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(limit)
        .offset(offset);

  return {
    items: rows.map(mapAuditRow),
    total,
  };
}

/**
 * Queries all matching audit logs (up to max limit) for CSV export.
 */
export async function findAuditLogsForExport(
  filters: Partial<AuditQueryInput>,
  maxLimit: number = 5000
): Promise<AuditLogRecord[]> {
  const conditions = buildConditions(filters);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const query = db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      oldData: auditLogs.oldData,
      newData: auditLogs.newData,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
      userName: users.name,
      userEmail: users.email,
      userRoleCode: roles.code,
      userRoleName: roles.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(roles, eq(users.roleId, roles.id));

  const rows = whereClause
    ? await query
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(maxLimit)
    : await query
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(maxLimit);

  return rows.map(mapAuditRow);
}

/**
 * Retrieves distinct actions, entity types, and active actors for filter dropdowns.
 */
export async function getAuditFilterOptions(): Promise<AuditFilterOptions> {
  const [actionRows, entityRows, actorRows] = await Promise.all([
    db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .where(isNotNull(auditLogs.action))
      .orderBy(asc(auditLogs.action)),
    db
      .selectDistinct({ entityType: auditLogs.entityType })
      .from(auditLogs)
      .where(isNotNull(auditLogs.entityType))
      .orderBy(asc(auditLogs.entityType)),
    db
      .selectDistinct({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(asc(users.name)),
  ]);

  return {
    actions: actionRows.map((r) => r.action).filter(Boolean),
    entityTypes: entityRows.map((r) => r.entityType!).filter(Boolean),
    actors: actorRows.filter((a) => a.id && a.name),
  };
}
