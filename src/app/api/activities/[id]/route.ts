import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  editManualActivity,
  deleteManualActivity,
} from "@/features/activities/services/activity.service";

/**
 * PATCH /api/activities/[id]
 * Edits a manual communication activity (subject, description, outcome, metadata).
 * Strictly restricted to the author or SuperAdmin; system events cannot be edited.
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const activity = await editManualActivity(user, id, body);

  return successResponse({
    statusCode: 200,
    message: "Activity updated successfully.",
    data: { activity },
  });
});

/**
 * DELETE /api/activities/[id]
 * Soft-deletes a manual communication activity.
 * Strictly restricted to the author or SuperAdmin; system events cannot be deleted.
 */
export const DELETE = withErrorHandling(async (_request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const result = await deleteManualActivity(user, id);

  return successResponse({
    statusCode: 200,
    message: result.message,
    data: { success: true },
  });
});
