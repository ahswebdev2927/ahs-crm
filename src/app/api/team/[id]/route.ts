import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { UsersService } from "@/features/users/services/users.service";
import { updateUserSchema } from "@/features/users/schemas/user.schema";

export const GET = withErrorHandling(
  async (_request: NextRequest, context) => {
    const rawParams = await context?.params;
    const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";

    const user = await UsersService.getTeamMember(id);

    return successResponse({
      statusCode: 200,
      message: "Team member details retrieved successfully.",
      data: { user },
    });
  }
);

export const PATCH = withErrorHandling(
  async (request: NextRequest, context) => {
    const rawParams = await context?.params;
    const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
    const body = await request.json();

    const validatedInput = updateUserSchema.parse(body);
    const updatedUser = await UsersService.updateTeamMember(id, validatedInput);

    return successResponse({
      statusCode: 200,
      message: "Team member updated successfully.",
      data: { user: updatedUser },
    });
  }
);
