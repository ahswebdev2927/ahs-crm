import { db } from "@/db";
import { auditLogs, leadActivities } from "@/db/schema";
import { logger } from "@/lib/logger";

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
 * Records an immutable administrative and financial audit log in `audit_logs`.
 */
export async function recordAuditLog(params: LogAuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId || null,
      action: params.action,
      entityType: params.entityType || null,
      entityId: params.entityId || null,
      oldData: params.oldData ? JSON.stringify(params.oldData) : null,
      newData: params.newData ? JSON.stringify(params.newData) : null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
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
