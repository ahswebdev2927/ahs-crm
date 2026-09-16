import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getCalendarEvents } from "@/features/appointments/services/appointment.service";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);

  const startDate = searchParams.get("startDate") ? Number(searchParams.get("startDate")) : undefined;
  const endDate = searchParams.get("endDate") ? Number(searchParams.get("endDate")) : undefined;

  const events = await getCalendarEvents(user, startDate, endDate);

  return successResponse({
    statusCode: 200,
    message: "Calendar events retrieved successfully.",
    data: { events },
  });
});
