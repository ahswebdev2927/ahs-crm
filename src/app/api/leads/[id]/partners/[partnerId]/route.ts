import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  updateLeadPartner,
  removeLeadPartner,
} from "@/features/leads/services/lead-partner.service";
import {
  updateLeadPartnerSchema,
  removeLeadPartnerSchema,
} from "@/features/leads/schemas/lead-partner.schema";

export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const partnerId = Array.isArray(rawParams?.partnerId)
    ? rawParams.partnerId[0]
    : rawParams?.partnerId || "";

  const body = await request.json();
  const validatedInput = updateLeadPartnerSchema.parse(body);

  const updatedPartner = await updateLeadPartner(
    id,
    partnerId,
    validatedInput,
    user
  );

  return successResponse({
    statusCode: 200,
    message: "Lead partner updated successfully.",
    data: { partner: updatedPartner },
  });
});

export const DELETE = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const partnerId = Array.isArray(rawParams?.partnerId)
    ? rawParams.partnerId[0]
    : rawParams?.partnerId || "";

  let body = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch (_e) {
    // Body is optional for DELETE
  }

  const validatedInput = removeLeadPartnerSchema.parse(body);

  const removedPartner = await removeLeadPartner(
    id,
    partnerId,
    validatedInput,
    user
  );

  return successResponse({
    statusCode: 200,
    message: "Lead partner removed successfully.",
    data: { partner: removedPartner },
  });
});
