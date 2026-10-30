import { db } from "@/db";
import { rateLimits } from "@/db/schema/security";
import { lt } from "drizzle-orm";
import { logger } from "@/lib/logger";

export interface RateLimitCleanupResult {
  deletedCount: number;
  timestamp: number;
}

/**
 * Purges expired rate limits from the database.
 */
export async function executeRateLimitCleanup(): Promise<RateLimitCleanupResult> {
  const now = Date.now();
  const result = await db.delete(rateLimits).where(lt(rateLimits.expiresAt, now));
  const resultObj = result as unknown as { rowsAffected?: number; changes?: number };
  const deletedCount = resultObj.rowsAffected ?? resultObj.changes ?? 0;

  logger.info(
    {
      event: "CRON_CLEANUP_RATE_LIMITS",
      deletedCount,
      timestamp: now,
    },
    `Cron cleanup completed: ${deletedCount} expired rate limits purged`
  );

  return {
    deletedCount,
    timestamp: now,
  };
}
