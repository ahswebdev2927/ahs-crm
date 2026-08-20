import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { successResponse } from "@/lib/api/response";
import { UsersService } from "@/features/users/services/users.service";
import { resetUserPasswordSchema } from "@/features/users/schemas/user.schema";

export const PATCH = withErrorHandling(
  async (request: NextRequest, context) => {
    const rawParams = await context?.params;
    const id = Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id || "";
    const body = await request.json();

    const validatedInput = resetUserPasswordSchema.parse(body);
    const result = await UsersService.resetMemberPassword(id, validatedInput);

    return successResponse({
      statusCode: 200,
      message: result.message,
      data: result,
    });
  }
);
