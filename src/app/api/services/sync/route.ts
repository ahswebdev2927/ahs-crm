import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { syncServicesFromWebsite } from "@/features/services";

export const POST = withErrorHandling(async (_request: NextRequest) => {
  const user = await requireAuth();

  const syncResult = await syncServicesFromWebsite(user);

  return successResponse({
    statusCode: 200,
    message: `Website sync completed: ${syncResult.addedCount} plans added, ${syncResult.updatedCount} plans updated.`,
    data: syncResult,
  });
});
