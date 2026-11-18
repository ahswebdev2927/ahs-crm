import { deleteExpiredSessions } from "@/features/auth/repositories/auth.repository";
import { logger } from "@/lib/logger";

export interface SessionCleanupResult {
  deletedCount: number;
  timestamp: number;
}

/**
 * Purges expired sessions from the database.
 */
export async function executeSessionCleanup(): Promise<SessionCleanupResult> {
  const now = Date.now();
  const result = await deleteExpiredSessions(now);
  const resultObj = result as unknown as { rowsAffected?: number; changes?: number };
  const deletedCount = resultObj.rowsAffected ?? resultObj.changes ?? 0;

  logger.info(
    {
      event: "CRON_CLEANUP_SESSIONS",
      deletedCount,
      timestamp: now,
    },
    `Cron session cleanup completed: ${deletedCount} expired sessions purged`
  );

  return {
    deletedCount,
    timestamp: now,
  };
}
