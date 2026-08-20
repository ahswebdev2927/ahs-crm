import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { UsersService } from "@/features/users/services/users.service";
import { updateUserStatusSchema } from "@/features/users/schemas/user.schema";

export const PATCH = withErrorHandling(
  async (request: NextRequest, context) => {
    const rawParams = await context?.params;
    const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
    const body = await request.json();

    const validatedInput = updateUserStatusSchema.parse(body);
    const updatedUser = await UsersService.changeMemberStatus(id, validatedInput);

    return successResponse({
      statusCode: 200,
      message: `Team member status updated to '${validatedInput.status}'.`,
      data: { user: updatedUser },
    });
  }
);
