import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { updateSubscription } from "@/features/services";

export const PATCH = withErrorHandling(
  async (request: NextRequest, context) => {
    const user = await requireAuth();
    const rawParams = await context?.params;
    const assignmentId = Array.isArray(rawParams?.assignmentId)
      ? rawParams.assignmentId[0]
      : rawParams?.assignmentId || "";
    const body = await request.json();

    const subscription = await updateSubscription(user, assignmentId, body);

    return successResponse({
      statusCode: 200,
      message: "Customer subscription updated successfully.",
      data: { subscription },
    });
  }
);

