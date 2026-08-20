import { NextRequest } from "next/server";
import { db } from "@/db";
import { rateLimits } from "@/db/schema/security";
import { lt } from "drizzle-orm";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { AppError } from "@/lib/errors/AppError";
import { logger } from "@/lib/logger";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const incomingSecret = request.headers.get("x-cron-secret") || searchParams.get("secret");
  const systemSecret = process.env.CRON_SECRET || "development_cron_secret_key";

  if (!incomingSecret || incomingSecret !== systemSecret) {
    throw new AppError("Unauthorized cron trigger.", 401, "UNAUTHORIZED");
  }

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

  return successResponse({
    statusCode: 200,
    message: "Expired rate limits cleaned up successfully.",
    data: {
      deletedCount,
      timestamp: now,
    },
  });
});

