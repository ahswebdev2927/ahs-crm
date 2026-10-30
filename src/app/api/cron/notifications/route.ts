import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { validateCronSecret, CRON_RESPONSE_HEADERS } from "@/lib/cron-auth";
import { executeNotificationCron } from "@/features/notifications/services/notification-cron.service";

/**
 * Dedicated cron route for notification maintenance:
 * 1. Alerts field reps of appointments starting in the next 30 minutes.
 * 2. Alerts team members of overdue tasks (throttled to max 1 per 12h per task).
 * 3. Alerts owners of overdue follow-ups (throttled to max 1 per 12h per follow-up).
 * 4. Cleans up read notifications older than 60 days.
 *
 * Supports both GET and POST for Cron-job.org and remote webhook runners.
 */
async function handleNotificationCron(request: NextRequest) {
  validateCronSecret(request);
  const startTime = Date.now();

  const results = await executeNotificationCron();
  const durationMs = Date.now() - startTime;

  return NextResponse.json(
    {
      success: true,
      message: "Scheduled notifications check executed successfully.",
      data: {
        durationMs,
        ...results,
      },
    },
    {
      status: 200,
      headers: CRON_RESPONSE_HEADERS,
    }
  );
}

export const GET = withErrorHandling(handleNotificationCron);
export const POST = withErrorHandling(handleNotificationCron);
