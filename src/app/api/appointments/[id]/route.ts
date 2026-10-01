import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getAppointmentById,
  getAppointmentWithVisitById,
  updateAppointment,
} from "@/features/appointments/services/appointment.service";

export const GET = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const withVisit = request.nextUrl.searchParams.get("withVisit") === "true";

  const appointment = withVisit
    ? await getAppointmentWithVisitById(user, id)
    : await getAppointmentById(user, id);

  return successResponse({
    statusCode: 200,
    message: "Appointment retrieved successfully.",
    data: { appointment },
  });
});

export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const appointment = await updateAppointment(user, id, body);

  return successResponse({
    statusCode: 200,
    message: "Appointment updated successfully.",
    data: { appointment },
  });
});
