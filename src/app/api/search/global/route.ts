import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { searchGlobalEntities } from "@/features/search/services/global-search.service";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());

  const result = await searchGlobalEntities(user, rawParams);

  return successResponse({
    statusCode: 200,
    message: "Global search completed successfully.",
    data: result,
  });
});
