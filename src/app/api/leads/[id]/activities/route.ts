import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { addLeadActivity } from "@/features/leads/services/lead.service";

export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const activity = await addLeadActivity(user, id, body);

    return successResponse({
      statusCode: 201,
      message: "Lead activity logged successfully.",
      data: activity,
    });
  }
);
