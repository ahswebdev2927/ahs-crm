import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getVisitForAppointment,
  startVisitFromAppointment,
  updateFieldVisit,
} from "@/features/field-visits/services/field-visit.service";
import { AppError } from "@/lib/errors/AppError";

export const GET = withErrorHandling(async (_request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const appointmentId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

  const fieldVisit = await getVisitForAppointment(user, appointmentId);

  return successResponse({
    statusCode: 200,
    message: "Field visit for appointment retrieved successfully.",
    data: { fieldVisit },
  });
});

export const POST = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const appointmentId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  let body = {};
  try {
    body = await request.json();
  } catch (_e) {
    // Body optional for starting visit
  }

  const fieldVisit = await startVisitFromAppointment(user, appointmentId, body);

  return successResponse({
    statusCode: 201,
    message: "Field visit started successfully.",
    data: { fieldVisit },
  });
});

export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const appointmentId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const existingVisit = await getVisitForAppointment(user, appointmentId);
  if (!existingVisit) {
    throw new AppError("No field visit exists for this appointment yet.", 404, "NOT_FOUND");
  }

  const fieldVisit = await updateFieldVisit(user, existingVisit.id, body);

  return successResponse({
    statusCode: 200,
    message: "Field visit report updated successfully.",
    data: { fieldVisit },
  });
});
