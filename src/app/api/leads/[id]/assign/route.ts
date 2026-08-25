import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { assignLead } from "@/features/leads/services/lead.service";

export const POST = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const updatedLead = await assignLead(user, id, body);

  return successResponse({
    statusCode: 200,
    message: "Lead ownership reassigned successfully.",
    data: { lead: updatedLead },
  });
});
