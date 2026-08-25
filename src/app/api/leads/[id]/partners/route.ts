import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getLeadPartnershipSummary,
  addLeadPartner,
} from "@/features/leads/services/lead-partner.service";
import { addLeadPartnerSchema } from "@/features/leads/schemas/lead-partner.schema";

export const GET = withErrorHandling(async (_request: NextRequest, context) => {
  await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const partnershipSummary = await getLeadPartnershipSummary(id);

  return successResponse({
    statusCode: 200,
    message: "Lead partnership details retrieved successfully.",
    data: { partnershipSummary },
  });
});

export const POST = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const validatedInput = addLeadPartnerSchema.parse(body);
  const newPartner = await addLeadPartner(id, validatedInput, user);

  return successResponse({
    statusCode: 201,
    message: "Lead partner added successfully.",
    data: { partner: newPartner },
  });
});
