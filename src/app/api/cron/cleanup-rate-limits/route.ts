import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { validateCronSecret, CRON_RESPONSE_HEADERS } from "@/lib/cron-auth";
import { executeRateLimitCleanup } from "@/features/security/services/rate-limit-cleanup.service";

/**
 * Dedicated cron route to purge expired rate limits from the database.
 * Supports both GET and POST for Cron-job.org and remote webhook runners.
 */
async function handleRateLimitCleanup(request: NextRequest) {
  validateCronSecret(request);
  const startTime = Date.now();

  const results = await executeRateLimitCleanup();
  const durationMs = Date.now() - startTime;

  return NextResponse.json(
    {
      success: true,
      message: "Expired rate limits cleaned up successfully.",
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

export const GET = withErrorHandling(handleRateLimitCleanup);
export const POST = withErrorHandling(handleRateLimitCleanup);
