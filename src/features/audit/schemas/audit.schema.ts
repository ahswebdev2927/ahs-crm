import { z } from "zod";

/**
 * Zod schema for querying and filtering audit logs
 */
export const auditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  entityType: z.string().trim().optional(),
  action: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
export type AuditQueryRawInput = z.input<typeof auditQuerySchema>;

/**
 * User / Actor representation attached to an audit entry
 */
export interface AuditActor {
  id: string;
  name: string;
  email: string;
  roleCode?: string | null;
  roleName?: string | null;
}

/**
 * Individual audit record structure with parsed JSON deltas
 */
export interface AuditLogRecord {
  id: number;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldData: Record<string, any> | null;
  newData: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user?: AuditActor | null;
}

/**
 * Paginated response structure for audit log queries
 */
export interface AuditQueryResponse {
  items: AuditLogRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Distinct filter dropdown options for the audit UI
 */
export interface AuditFilterOptions {
  actions: string[];
  entityTypes: string[];
  actors: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}
