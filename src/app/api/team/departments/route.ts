import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { UsersService } from "@/features/users/services/users.service";

export const GET = withErrorHandling(async (_request: NextRequest) => {
  const metadata = await UsersService.listDepartmentsAndRoles();

  return successResponse({
    statusCode: 200,
    message: "Department and role metadata retrieved successfully.",
    data: metadata,
  });
});
