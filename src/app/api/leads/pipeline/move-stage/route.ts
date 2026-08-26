import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { moveLeadStage } from "@/features/leads/services/lead.service";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const body = await request.json();

  const updatedLead = await moveLeadStage(user, body);

  return successResponse({
    statusCode: 200,
    message: "Lead stage and position updated successfully.",
    data: { lead: updatedLead },
  });
});
