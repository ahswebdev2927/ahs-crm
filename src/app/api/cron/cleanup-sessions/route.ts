import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { validateCronSecret, CRON_RESPONSE_HEADERS } from "@/lib/cron-auth";
import { executeSessionCleanup } from "@/features/security/services/session-cleanup.service";

/**
 * Dedicated cron route to purge expired sessions from the database.
 * Supports both GET and POST for Cron-job.org and remote webhook runners.
 */
async function handleSessionCleanup(request: NextRequest) {
  validateCronSecret(request);
  const startTime = Date.now();

  const results = await executeSessionCleanup();
  const durationMs = Date.now() - startTime;

  return NextResponse.json(
    {
      success: true,
      message: "Expired sessions cleaned up successfully.",
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

export const GET = withErrorHandling(handleSessionCleanup);
export const POST = withErrorHandling(handleSessionCleanup);
