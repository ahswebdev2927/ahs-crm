import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import {
  getVisitForAppointment,
  attachMediaToVisit,
  deleteMediaFromVisit,
} from "@/features/field-visits/services/field-visit.service";
import { AppError } from "@/lib/errors/AppError";

export const POST = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const appointmentId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const body = await request.json();

  const existingVisit = await getVisitForAppointment(user, appointmentId);
  if (!existingVisit) {
    throw new AppError("No field visit exists for this appointment yet to attach media.", 404, "NOT_FOUND");
  }

  if (!body.cloudinaryPublicId || !body.cloudinaryUrl) {
    throw new AppError("Cloudinary media information is required.", 400, "BAD_REQUEST");
  }

  const media = await attachMediaToVisit(user, existingVisit.id, {
    cloudinaryPublicId: body.cloudinaryPublicId,
    cloudinaryUrl: body.cloudinaryUrl,
    resourceType: body.resourceType || "image",
    caption: body.caption || null,
  });

  return successResponse({
    statusCode: 201,
    message: "Media attached to field visit successfully.",
    data: { media },
  });
});

export const DELETE = withErrorHandling(async (request: NextRequest, context) => {
  const user = await requireAuth();
  const rawParams = await context?.params;
  const appointmentId = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
  const mediaId = request.nextUrl.searchParams.get("mediaId");

  if (!mediaId) {
    throw new AppError("mediaId query parameter is required.", 400, "BAD_REQUEST");
  }

  const existingVisit = await getVisitForAppointment(user, appointmentId);
  if (!existingVisit) {
    throw new AppError("No field visit exists for this appointment.", 404, "NOT_FOUND");
  }

  await deleteMediaFromVisit(user, existingVisit.id, mediaId);

  return successResponse({
    statusCode: 200,
    message: "Media removed from field visit successfully.",
    data: { success: true },
  });
});
