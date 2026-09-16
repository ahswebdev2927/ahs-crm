import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
} from "@/features/appointments/services/appointment.service";

export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const { action } = body;

  let appointment;
  if (action === "reschedule") {
    appointment = await rescheduleAppointment(user, id, body);
  } else if (action === "cancel") {
    appointment = await cancelAppointment(user, id, body);
  } else {
    appointment = await updateAppointmentStatus(user, id, body);
  }

  return successResponse({
    statusCode: 200,
    message: `Appointment ${action || 'status'} updated successfully.`,
    data: { appointment },
  });
});
