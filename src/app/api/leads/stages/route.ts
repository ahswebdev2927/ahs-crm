import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getLeadStages,
  createLeadStage,
  reorderLeadStages,
} from "@/features/leads/services/lead.service";

export const GET = withErrorHandling(async (_request: NextRequest) => {
  const user = await requireAuth();
  const stages = await getLeadStages(user);

  return successResponse({
    statusCode: 200,
    message: "Lead stages retrieved successfully.",
    data: { stages },
  });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const body = await request.json();

  const newStage = await createLeadStage(user, body);

  return successResponse({
    statusCode: 201,
    message: "Lead stage created successfully.",
    data: { stage: newStage },
  });
});

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const body = await request.json();

  const updatedStages = await reorderLeadStages(user, body);

  return successResponse({
    statusCode: 200,
    message: "Lead stage sequence reordered successfully.",
    data: { stages: updatedStages },
  });
});
