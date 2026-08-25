import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getLeads, createLead } from "@/features/leads/services/lead.service";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const result = await getLeads(user, queryParams as any);

  return successResponse({
    statusCode: 200,
    message: "Leads retrieved successfully.",
    data: result,
  });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const body = await request.json();

  const newLead = await createLead(user, body);

  return successResponse({
    statusCode: 201,
    message: "Lead created successfully.",
    data: { lead: newLead },
  });
});
