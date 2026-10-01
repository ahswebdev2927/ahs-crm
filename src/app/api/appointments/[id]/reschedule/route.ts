import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { rescheduleAppointment } from "@/features/appointments/services/appointment.service";

export const POST = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const appointment = await rescheduleAppointment(user, id, body);

  return successResponse({
    statusCode: 200,
    message: "Appointment rescheduled successfully.",
    data: { appointment },
  });
});
