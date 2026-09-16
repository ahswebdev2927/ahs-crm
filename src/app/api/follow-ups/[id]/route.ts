import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getFollowUpById,
  updateFollowUp,
  cancelFollowUp,
} from "@/features/followups/services/followup.service";

export const GET = withErrorHandling(async (_request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const followUp = await getFollowUpById(user, id);

  return successResponse({
    statusCode: 200,
    message: "Follow-up details retrieved successfully.",
    data: { followUp },
  });
});

export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const updated = await updateFollowUp(user, id, body);

  return successResponse({
    statusCode: 200,
    message: "Follow-up updated successfully.",
    data: { followUp: updated },
  });
});

export const DELETE = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  let body = {};
  try {
    body = await request.json();
  } catch {
    // Body optional on DELETE/cancel
  }

  const cancelled = await cancelFollowUp(user, id, body as any);

  return successResponse({
    statusCode: 200,
    message: "Follow-up cancelled successfully.",
    data: { followUp: cancelled },
  });
});
