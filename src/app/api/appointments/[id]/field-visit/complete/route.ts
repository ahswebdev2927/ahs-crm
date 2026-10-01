import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getVisitForAppointment,
  completeFieldVisit,
} from "@/features/field-visits/services/field-visit.service";
import { AppError } from "@/lib/errors/AppError";

export const POST = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const appointmentId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const existingVisit = await getVisitForAppointment(user, appointmentId);
  if (!existingVisit) {
    throw new AppError("No field visit exists for this appointment to complete.", 404, "NOT_FOUND");
  }

  const fieldVisit = await completeFieldVisit(user, existingVisit.id, body);

  return successResponse({
    statusCode: 200,
    message: "Field visit completed and report submitted successfully.",
    data: { fieldVisit },
  });
});
