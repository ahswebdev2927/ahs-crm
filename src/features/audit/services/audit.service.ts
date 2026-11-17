import { db } from "@/db";
import { auditLogs, leadActivities } from "@/db/schema";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors/AppError";
import type { AuthenticatedUserPayload } from "@/features/auth/services/auth.service";
import {
  auditQuerySchema,
  type AuditQueryInput,
  type AuditQueryRawInput,
  type AuditQueryResponse,
  type AuditFilterOptions,
} from "../schemas/audit.schema";
import {
  findAuditLogs,
  findAuditLogsForExport,
  getAuditFilterOptions,
} from "../repositories/audit.repository";

export interface LogAuditParams {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Escapes cell values per RFC 4180 standards for CSV exports.
 */
function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Asserts that the authenticated user possesses SuperAdmin privileges.
 */
function assertSuperAdmin(user: AuthenticatedUserPayload): void {
  if (user.role.code !== "super_admin") {
    throw new AppError(
      "Access denied. Only SuperAdmin can view or export audit log entries.",
      403,
      "FORBIDDEN"
    );
  }
}

/**
 * Records an immutable administrative and financial audit log in `audit_logs`.
 * Automatically extracts IP address and User Agent headers if not explicitly passed.
 */
export async function recordAuditLog(params: LogAuditParams): Promise<void> {
  try {
    let ipAddress = params.ipAddress ?? null;
    let userAgent = params.userAgent ?? null;

    // Automatically resolve IP and User-Agent if executed within a Next.js request context
    if (!ipAddress || !userAgent) {
      try {
        const { headers } = await import("next/headers");
        const headersList = await headers();
        if (!ipAddress) {
          const forwarded = headersList.get("x-forwarded-for");
          if (forwarded) {
            ipAddress = forwarded.split(",")[0].trim();
          } else {
            const realIp = headersList.get("x-real-ip");
            if (realIp) {
              ipAddress = realIp.trim();
            }
          }
        }
        if (!userAgent) {
          userAgent = headersList.get("user-agent") || null;
        }
      } catch {
        // Ignored safely if executed outside Next.js request contexts (e.g. background tasks, scripts)
      }
    }

    await db.insert(auditLogs).values({
      userId: params.userId || null,
      action: params.action,
      entityType: params.entityType || null,
      entityId: params.entityId || null,
      oldData: params.oldData ? JSON.stringify(params.oldData) : null,
      newData: params.newData ? JSON.stringify(params.newData) : null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: new Date(),
    });
  } catch (error) {
    logger.error(
      { error, action: params.action, entityType: params.entityType, entityId: params.entityId },
      "Failed to write audit log entry."
    );
  }
}

/**
 * Helper to record activity on a lead timeline if an entity is associated with a lead.
 */
export async function recordLeadActivityIfApplicable(
  leadId: string | null | undefined,
  userId: string,
  type: "note" | "call" | "email" | "meeting",
  content: string
): Promise<void> {
  if (!leadId) return;

  try {
    await db.insert(leadActivities).values({
      id: crypto.randomUUID(),
      leadId,
      type,
      content,
      createdById: userId,
      createdAt: new Date(),
    });
  } catch (error) {
    logger.error({ error, leadId, type }, "Failed to record lead timeline activity.");
  }
}

/**
 * Retrieves paginated audit logs for the SuperAdmin audit explorer.
 */
export async function getAuditLogs(
  user: AuthenticatedUserPayload,
  params: AuditQueryRawInput
): Promise<AuditQueryResponse> {
  assertSuperAdmin(user);
  const validated = auditQuerySchema.parse(params);

  const { items, total } = await findAuditLogs(validated);
  const totalPages = Math.ceil(total / validated.limit);

  return {
    items,
    pagination: {
      total,
      page: validated.page,
      limit: validated.limit,
      totalPages,
    },
  };
}

/**
 * Generates an RFC 4180 CSV export of filtered audit records for SuperAdmin.
 */
export async function exportAuditLogsCsv(
  user: AuthenticatedUserPayload,
  params: AuditQueryRawInput
): Promise<{ filename: string; csv: string; count: number }> {
  assertSuperAdmin(user);
  const validated = auditQuerySchema.parse(params);

  const records = await findAuditLogsForExport(validated);

  const headers = [
    "ID",
    "Timestamp (ISO)",
    "Action",
    "Entity Type",
    "Entity ID",
    "Actor ID",
    "Actor Name",
    "Actor Email",
    "Actor Role",
    "IP Address",
    "User Agent",
    "Old Data (JSON)",
    "New Data (JSON)",
  ];

  const rows: string[] = [headers.map(escapeCsvCell).join(",")];

  for (const r of records) {
    const row = [
      r.id,
      r.createdAt.toISOString(),
      r.action,
      r.entityType || "",
      r.entityId || "",
      r.userId || "",
      r.user?.name || "System",
      r.user?.email || "",
      r.user?.roleName || r.user?.roleCode || "",
      r.ipAddress || "",
      r.userAgent || "",
      r.oldData ? JSON.stringify(r.oldData) : "",
      r.newData ? JSON.stringify(r.newData) : "",
    ];
    rows.push(row.map(escapeCsvCell).join(","));
  }

  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `ahs-audit-logs-${dateStr}.csv`;

  return {
    filename,
    csv: rows.join("\r\n"),
    count: records.length,
  };
}

/**
 * Retrieves filter options (distinct actions, entity types, actors) for SuperAdmin UI.
 */
export async function getAuditFilterMetadata(
  user: AuthenticatedUserPayload
): Promise<AuditFilterOptions> {
  assertSuperAdmin(user);
  return await getAuditFilterOptions();
}
