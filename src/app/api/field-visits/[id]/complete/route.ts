import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { completeFieldVisit } from "@/features/field-visits/services/field-visit.service";

export const POST = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const visit = await completeFieldVisit(user, id, body);

  return successResponse({
    statusCode: 200,
    message: "Field visit completed successfully.",
    data: { visit },
  });
});
