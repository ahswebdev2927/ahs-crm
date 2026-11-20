import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { searchGlobalEntities } from "@/features/search/services/global-search.service";
import { getClientIp, checkRateLimit } from "@/lib/security/rate-limit";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();

  const clientIp = await getClientIp();
  await checkRateLimit({
    key: "search-global",
    identifier: `${user.id}:${clientIp}`,
    limit: 30,
    windowMs: 60 * 1000,
    message: "Search rate limit exceeded. Please wait a minute before making more queries.",
  });

  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());

  const result = await searchGlobalEntities(user, rawParams);

  return successResponse({
    statusCode: 200,
    message: "Global search completed successfully.",
    data: result,
  });
});
