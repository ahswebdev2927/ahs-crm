import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/features/auth/services/authorization.service";
import { getFieldSalesUsers } from "@/features/appointments/services/appointment.service";

export const GET = withErrorHandling(async (_request: NextRequest) => {
  const user = await requireAuth();

  const users = await getFieldSalesUsers(user);

  return successResponse({
    statusCode: 200,
    message: "Field Sales representatives retrieved successfully.",
    data: { users },
  });
});
