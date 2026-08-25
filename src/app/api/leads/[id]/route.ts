import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getLeadById, updateLead } from "@/features/leads/services/lead.service";

export const GET = withErrorHandling(async (_request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const lead = await getLeadById(user, id);

  return successResponse({
    statusCode: 200,
    message: "Lead details retrieved successfully.",
    data: { lead },
  });
});

export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const updatedLead = await updateLead(user, id, body);

  return successResponse({
    statusCode: 200,
    message: "Lead updated successfully.",
    data: { lead: updatedLead },
  });
});

export const DELETE = withErrorHandling(async (_request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const archivedLead = await updateLead(user, id, { status: "archived" });

  return successResponse({
    statusCode: 200,
    message: "Lead archived successfully.",
    data: { lead: archivedLead },
  });
});
