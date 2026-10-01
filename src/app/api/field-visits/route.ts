import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getFieldVisits,
  createFieldVisit,
} from "@/features/field-visits/services/field-visit.service";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const result = await getFieldVisits(user, queryParams as any);

  return successResponse({
    statusCode: 200,
    message: "Field visits retrieved successfully.",
    data: result,
  });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const body = await request.json();

  const visit = await createFieldVisit(user, body);

  return successResponse({
    statusCode: 201,
    message: "Field visit created successfully.",
    data: { visit },
  });
});
