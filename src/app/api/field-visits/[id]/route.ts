import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getFieldVisitById,
  updateFieldVisit,
} from "@/features/field-visits/services/field-visit.service";

export const GET = withErrorHandling(async (_request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const visit = await getFieldVisitById(user, id);

  return successResponse({
    statusCode: 200,
    message: "Field visit details retrieved successfully.",
    data: { visit },
  });
});

export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const visit = await updateFieldVisit(user, id, body);

  return successResponse({
    statusCode: 200,
    message: "Field visit updated successfully.",
    data: { visit },
  });
});
