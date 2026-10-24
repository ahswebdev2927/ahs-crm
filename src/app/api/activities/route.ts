import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getTimeline,
  logManualActivity,
} from "@/features/activities/services/activity.service";
import { activityQuerySchema } from "@/features/activities/schemas/activity.schema";

/**
 * GET /api/activities
 * Fetches the unified activity timeline for a lead or customer with category, search, and pagination filters.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());
  const parsed = activityQuerySchema.parse(queryParams);

  const result = await getTimeline(user, parsed);

  return successResponse({
    statusCode: 200,
    message: "Activity timeline retrieved successfully.",
    data: result,
  });
});

/**
 * POST /api/activities
 * Logs a new manual communication activity (call, note, email, meeting, WhatsApp).
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const body = await request.json();

  const activity = await logManualActivity(user, body);

  return successResponse({
    statusCode: 201,
    message: "Activity logged successfully.",
    data: { activity },
  });
});
