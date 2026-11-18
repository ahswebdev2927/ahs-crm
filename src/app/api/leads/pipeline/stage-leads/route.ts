import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getStageLeads } from "@/features/leads/services/lead.service";
import { AppError } from "@/lib/errors/AppError";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);

  const stageIdStr = searchParams.get("stageId");
  if (!stageIdStr) {
    throw new AppError("stageId parameter is required.", 400, "VALIDATION_ERROR");
  }

  const stageId = parseInt(stageIdStr, 10);
  if (isNaN(stageId)) {
    throw new AppError("stageId must be a valid number.", 400, "VALIDATION_ERROR");
  }

  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const limit = parseInt(searchParams.get("limit") || "25", 10);

  const queryParams = Object.fromEntries(searchParams.entries());

  const result = await getStageLeads(user, stageId, queryParams as any, offset, limit);

  return successResponse({
    statusCode: 200,
    message: "Stage leads retrieved successfully.",
    data: result,
  });
});
