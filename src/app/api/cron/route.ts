import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { validateCronSecret, CRON_RESPONSE_HEADERS } from "@/lib/cron-auth";
import { executeNotificationCron } from "@/features/notifications/services/notification-cron.service";
import { executeRateLimitCleanup } from "@/features/security/services/rate-limit-cleanup.service";

/**
 * Consolidated master cron handler for Cron-job.org and remote schedulers.
 * Executes all periodic maintenance in a single ping:
 * 1. 30m appointment reminders
 * 2. Overdue task alerts
 * 3. Overdue follow-up alerts
 * 4. 60-day read notifications auto-purge
 * 5. Expired rate limits cleanup
 */
async function handleMasterCron(request: NextRequest) {
  validateCronSecret(request);
  const startTime = Date.now();

  const [notifications, rateLimits] = await Promise.all([
    executeNotificationCron(),
    executeRateLimitCleanup(),
  ]);

  const durationMs = Date.now() - startTime;

  return NextResponse.json(
    {
      success: true,
      message: "Master cron execution completed successfully.",
      data: {
        durationMs,
        timestamp: new Date().toISOString(),
        notifications,
        rateLimits,
      },
    },
    {
      status: 200,
      headers: CRON_RESPONSE_HEADERS,
    }
  );
}

export const GET = withErrorHandling(handleMasterCron);
export const POST = withErrorHandling(handleMasterCron);
