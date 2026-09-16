import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getFollowUps,
  createFollowUp,
} from "@/features/followups/services/followup.service";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const result = await getFollowUps(user, queryParams as any);

  return successResponse({
    statusCode: 200,
    message: "Follow-ups retrieved successfully.",
    data: result,
  });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const body = await request.json();

  const followUp = await createFollowUp(user, body);

  return successResponse({
    statusCode: 201,
    message: "Follow-up scheduled successfully.",
    data: { followUp },
  });
});
