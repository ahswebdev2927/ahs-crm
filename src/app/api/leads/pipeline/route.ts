import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getPipelineBoard } from "@/features/leads/services/lead.service";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const boardData = await getPipelineBoard(user, queryParams as any);

  return successResponse({
    statusCode: 200,
    message: "Pipeline board data retrieved successfully.",
    data: boardData,
  });
});
